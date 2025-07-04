// SwipeMath - Juego de matemáticas para niños de 6-8 años con AR
import {loadGLTF} from "./libs/loader.js";
import {mockWithVideo} from './libs/camera-mock.js';
const THREE = window.MINDAR.IMAGE.THREE;

document.addEventListener('DOMContentLoaded', () => {
  // =================================================================================
  // CONFIGURACIÓN DE SONIDOS
  // =================================================================================
  const soundCorrect = new Audio('/static/assets/sounds/correct.mp3');
  const soundIncorrect = new Audio('/static/assets/sounds/incorrect.mp3');
  const soundLose = new Audio('/static/assets/sounds/lose.mp3');
  const soundVictory = new Audio('/static/assets/sounds/victory.mp3');
  const soundBackground = new Audio('/static/assets/sounds/theme-background.mp3');
  soundBackground.loop = true;
  soundBackground.volume = 0.3; // La música de fondo más baja para no saturar

  // =================================================================================
  // CONFIGURACIÓN DEL JUEGO
  // =================================================================================
  const gameConfig = {
    initialNumber: 10,      // Número con el que empieza el juego.
    choiceConfirmationDelay: 500, // Delay en ms para confirmar la elección con AR.

    // --- AJUSTES DE DIFICULTAD ---
    // Modifica los valores dentro de 'difficultySettings' para cambiar la jugabilidad.
    difficultySettings: {
      // --- Tiempo y Puntuación ---
      initialTicks: 200,      // Tiempo inicial en ticks (200 ticks = 20 segundos). Más alto = más fácil.
      maxTicks: 300,          // Tiempo máximo acumulable (30 segundos).
      correctChoiceTickBonus: 30, // Ticks ganados por respuesta correcta (+3 segundos).
      pointsPerCorrectChoice: 100, // Puntos ganados por respuesta correcta.
      levelUpScoreBase: 500, // Puntuación necesaria para el primer nivel.
      levelUpMultiplier: 1.5, // Cuánto más difícil se vuelve cada nivel.
      timerInterval: 100,     // Velocidad del temporizador en ms (100ms = 1 tick).

      // --- Lógica de Dificultad ---
      initialAlpha: 0.8,        // Factor de dificultad inicial (más bajo = más fácil).
      alphaIncrement: 0.1,    // Cuánto aumenta la dificultad por nivel.
      maxAlpha: 1.5,            // Dificultad máxima.

      // --- Parámetros de Operaciones ---
      addTimeRound_Y_MaxBase: 15, // Base para el número a sumar. Más bajo = más fácil.
      addTimeRound_Y_LevelMultiplier: 3, // Multiplicador por nivel para el número a sumar.
      subtractTimeRound_Y_MaxBase: 10, // Base para el número a restar.
      subtractTimeRound_Y_LevelMultiplier: 2, // Multiplicador por nivel para el número a restar.
    }
  };
  // =================================================================================

  // Variables del juego
  let currentNumber = gameConfig.initialNumber;
  let currentScore = 0;
  let nextLevelScore = gameConfig.difficultySettings.levelUpScoreBase;
  let currentTicks = gameConfig.difficultySettings.initialTicks; // 15 segundos iniciales
  let currentLevel = 1;
  let isAddTimeRound = true;
  let leftOperation = null;
  let rightOperation = null;
  let gameActive = true;
  let alpha = gameConfig.difficultySettings.initialAlpha; // Factor de dificultad
  let lastSide = null;
  let canProcessChoice = true; // Para evitar múltiples selecciones rápidas
  let gameTimer = null; // Referencia al temporizador del juego

  // Contenedor para la vista de AR (para que no tape la UI)
  const arContainer = document.createElement('div');
  arContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    transform: scaleX(-1);
  `;
  document.body.appendChild(arContainer);

  // Agregar estilos globales para glass-morphism
  const globalStyles = document.createElement('style');
  globalStyles.textContent = `
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
    }
    
    .glass-morphism {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    }
    
    .glass-morphism-dark {
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(78, 205, 196, 0.5); }
      50% { box-shadow: 0 0 40px rgba(78, 205, 196, 0.8); }
    }
    
    @keyframes slideIn {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(globalStyles);

  // Crear interfaz del juego SIN FONDO
  const gameContainer = document.createElement('div');
  gameContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
    display: none; /* Oculto inicialmente */
  `;

  // Barra de tiempo superior
  const timeBarContainer = document.createElement('div');
  timeBarContainer.className = 'glass-morphism';
  timeBarContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 30px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    z-index: 1001;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37),
                inset 0 2px 4px rgba(255, 255, 255, 0.1);
    overflow: hidden;
  `;
  
  const timeBar = document.createElement('div');
  timeBar.style.cssText = `
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #00ff88, #00ff44);
    border-radius: 18px;
    transition: width 0.1s ease, background 0.3s ease;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  `;
  
  const timeText = document.createElement('div');
  timeText.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    font-size: 14px;
    text-shadow: 2px 2px 4px black;
  `;
  
  timeBarContainer.appendChild(timeBar);
  timeBarContainer.appendChild(timeText);

  // Puntuación
  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'glass-morphism-dark';
  scoreDisplay.style.cssText = `
    position: fixed;
    top: 65px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 20px;
    font-weight: 600;
    text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
    z-index: 1001;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    padding: 12px 30px;
    border-radius: 15px;
    display: none; /* Oculto inicialmente */
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37),
                inset 0 2px 4px rgba(255, 255, 255, 0.05);
  `;

  // Número central con fondo semitransparente
  const centralNumber = document.createElement('div');
  centralNumber.className = 'glass-morphism';
  centralNumber.style.cssText = `
    width: 130px;
    height: 130px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 3px solid rgba(255, 255, 255, 0.8);
    border-radius: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 52px;
    font-weight: 800;
    color: #2c3e50;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3),
                0 5px 15px rgba(0, 0, 0, 0.2),
                inset 0 2px 4px rgba(255, 255, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  `;

  // Carta izquierda con fondo semitransparente
  const leftCard = document.createElement('div');
  leftCard.className = 'glass-morphism';
  leftCard.style.cssText = `
    position: absolute;
    left: 18%;
    width: 110px;
    height: 110px;
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.9), rgba(255, 71, 87, 0.9));
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: white;
    box-shadow: 0 12px 30px rgba(255, 107, 107, 0.4),
                0 5px 15px rgba(0, 0, 0, 0.2),
                inset 0 2px 4px rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  `;

  // Carta derecha con fondo semitransparente
  const rightCard = document.createElement('div');
  rightCard.className = 'glass-morphism';
  rightCard.style.cssText = `
    position: absolute;
    right: 18%;
    width: 110px;
    height: 110px;
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.9), rgba(69, 183, 175, 0.9));
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: white;
    box-shadow: 0 12px 30px rgba(78, 205, 196, 0.4),
                0 5px 15px rgba(0, 0, 0, 0.2),
                inset 0 2px 4px rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  `;

  // Indicador de tipo de ronda
  const roundTypeIndicator = document.createElement('div');
  roundTypeIndicator.className = 'glass-morphism-dark';
  roundTypeIndicator.style.cssText = `
    position: fixed;
    top: 110px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 35px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    z-index: 1001;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37),
                inset 0 2px 4px rgba(255, 255, 255, 0.05);
    text-transform: uppercase;
    letter-spacing: 1px;
  `;

  // Indicador de detección de stitch
  const stichIndicator = document.createElement('div');
  stichIndicator.className = 'glass-morphism';
  stichIndicator.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 25px;
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    z-index: 1001;
    display: none;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37),
                inset 0 2px 4px rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  `;
  stichIndicator.textContent = 'Mueve la stitch para elegir';

  // Línea separadora central
  const centerLine = document.createElement('div');
  centerLine.style.cssText = `
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 100vh;
    background-color: rgba(255, 255, 255, 0.3);
    z-index: 999;
    pointer-events: none;
    display: none; /* Oculto inicialmente */
  `;

  // Indicador para apuntar al marcador
  const detectionIndicator = document.createElement('div');
  detectionIndicator.className = 'glass-morphism-dark';
  detectionIndicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 30px 40px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 25px;
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    z-index: 1001;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5),
                inset 0 2px 4px rgba(255, 255, 255, 0.1);
    max-width: 80%;
    animation: fadeIn 0.5s ease-out;
  `;
  detectionIndicator.innerHTML = '<div style="font-size: 40px; margin-bottom: 15px;">📷</div>Coloca la tarjeta en el centro para detectar a Stitch';

  // Caja de explicación del juego
  const explanationBox = document.createElement('div');
  explanationBox.className = 'glass-morphism-dark';
  explanationBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    font-size: 15px;
    font-weight: 500;
    text-align: left;
    z-index: 1001;
    max-width: 280px;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37),
                inset 0 2px 4px rgba(255, 255, 255, 0.05);
    animation: slideIn 0.5s ease-out;
    line-height: 1.6;
  `;
  explanationBox.innerHTML = `
    <div style="margin-bottom: 12px; font-size: 18px; font-weight: 700; color: #4ecdc4;">🎯 Objetivo</div>
    <div style="margin-bottom: 16px;">Elige la operación que dé el mejor resultado.</div>
    <div style="margin-bottom: 12px; font-size: 18px; font-weight: 700; color: #ff6b6b;">🎮 Control</div>
    <div>Mueve a Stitch (con la tarjeta) hacia la izquierda o derecha para seleccionar.</div>
  `;
  document.body.appendChild(explanationBox);

  // Indicador de Subida de Nivel
  const levelUpIndicator = document.createElement('div');
  levelUpIndicator.className = 'glass-morphism';
  levelUpIndicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 40px 60px;
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.95), rgba(69, 183, 175, 0.95));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: white;
    border: 3px solid rgba(255, 255, 255, 0.6);
    border-radius: 30px;
    font-size: 52px;
    font-weight: 800;
    text-align: center;
    z-index: 2000;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 20px 60px rgba(78, 205, 196, 0.6),
                0 10px 30px rgba(0, 0, 0, 0.3),
                inset 0 2px 8px rgba(255, 255, 255, 0.3);
    text-shadow: 3px 3px 8px rgba(0, 0, 0, 0.4);
    animation: levelUpAnimation 1.5s ease-out forwards;
    letter-spacing: 2px;
  `;
  document.body.appendChild(levelUpIndicator);

  // Animación para el indicador de subida de nivel
  const levelUpStyle = document.createElement('style');
  levelUpStyle.textContent = `
    @keyframes levelUpAnimation {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.head.appendChild(levelUpStyle);

  // Agregar elementos al DOM
  gameContainer.appendChild(centralNumber);
  gameContainer.appendChild(leftCard);
  gameContainer.appendChild(rightCard);
  document.body.appendChild(gameContainer);
  document.body.appendChild(timeBarContainer);
  document.body.appendChild(scoreDisplay);
  document.body.appendChild(roundTypeIndicator);
  document.body.appendChild(stichIndicator);
  document.body.appendChild(centerLine);
  document.body.appendChild(detectionIndicator);

  // Funciones de generación de operaciones
  const generateAddTimeRound = () => {
    // Nueva lógica para que las opciones sean siempre competitivas
    const Z = Math.floor(Math.random() * 2) + 2; // Multiplicador entre 2 y 3
    
    // Generamos un 'Y' que sea competitivo con la multiplicación
    // El resultado de la suma será currentNumber + Y
    // El resultado de la multiplicación será currentNumber * Z
    // Queremos que Y sea cercano a currentNumber * (Z - 1) para que los resultados sean parecidos
    const idealY = currentNumber * (Z - 1);
    const randomFactor = (Math.random() - 0.5) * alpha; // Factor de aleatoriedad basado en la dificultad
    const Y = Math.max(1, Math.floor(idealY * (1 + randomFactor)));
    
    const addOperation = { type: 'add', value: Y, result: currentNumber + Y };
    const multiplyOperation = { type: 'multiply', value: Z, result: currentNumber * Z };

    // Asignar aleatoriamente a izquierda o derecha
    if (Math.random() > 0.5) {
      leftOperation = multiplyOperation;
      rightOperation = addOperation;
      leftCard.textContent = `× ${Z}`;
      rightCard.textContent = `+ ${Y}`;
    } else {
      leftOperation = addOperation;
      rightOperation = multiplyOperation;
      leftCard.textContent = `+ ${Y}`;
      rightCard.textContent = `× ${Z}`;
    }
    
    roundTypeIndicator.innerHTML = '<span style="font-size: 22px; margin-right: 10px;">➕</span>Ronda: SUMA vs MULTIPLICACIÓN<span style="font-size: 22px; margin-left: 10px;">✖️</span>';
    roundTypeIndicator.style.background = 'linear-gradient(135deg, rgba(0, 200, 100, 0.6), rgba(0, 150, 80, 0.6))';
  };

  const generateSubtractTimeRound = () => {
    // Nueva lógica para que las opciones sean siempre competitivas
    const Z = Math.floor(Math.random() * 3) + 2; // Divisor entre 2 y 4

    // Queremos que el resultado de la resta (currentNumber - Y) sea cercano a la división (currentNumber / Z)
    // Para ello, Y debe ser cercano a currentNumber * (1 - 1/Z)
    const idealY = currentNumber * (1 - 1 / Z);
    const randomFactor = (Math.random() - 0.5) * alpha;
    const Y = Math.max(1, Math.floor(idealY * (1 + randomFactor)));
    
    // Asegurarse de que el número no sea negativo
    if (Y >= currentNumber) {
      generateAddTimeRound(); // Si no se puede restar, forzar ronda de suma
      isAddTimeRound = false;
      return;
    }
    
    const subtractOperation = { type: 'subtract', value: Y, result: currentNumber - Y };
    const divideOperation = { type: 'divide', value: Z, result: Math.floor(currentNumber / Z) };

    // Asignar aleatoriamente a izquierda o derecha
    if (Math.random() > 0.5) {
      leftOperation = divideOperation;
      rightOperation = subtractOperation;
      leftCard.textContent = `÷ ${Z}`;
      rightCard.textContent = `− ${Y}`;
    } else {
      leftOperation = subtractOperation;
      rightOperation = divideOperation;
      leftCard.textContent = `− ${Y}`;
      rightCard.textContent = `÷ ${Z}`;
    }

    roundTypeIndicator.innerHTML = '<span style="font-size: 22px; margin-right: 10px;">➖</span>Ronda: RESTA vs DIVISIÓN<span style="font-size: 22px; margin-left: 10px;">➗</span>';
    roundTypeIndicator.style.background = 'linear-gradient(135deg, rgba(200, 50, 50, 0.6), rgba(150, 30, 30, 0.6))';
  };

  const generateNewRound = () => {
    if (isAddTimeRound) {
      generateAddTimeRound();
    } else {
      generateSubtractTimeRound();
    }
    
    // Alternar tipo de ronda
    isAddTimeRound = !isAddTimeRound;
  };

  const updateDisplay = () => {
    centralNumber.textContent = currentNumber;
    scoreDisplay.textContent = `Puntuación: ${currentScore} | Nivel: ${currentLevel}`;
    
    const timePercentage = Math.max(0, (currentTicks / gameConfig.difficultySettings.initialTicks) * 100);
    timeBar.style.width = timePercentage + '%';
    timeText.textContent = `${Math.ceil(currentTicks / 10)}s`;
    
    // Cambiar color según el tiempo restante
    if (currentTicks < 50) { // Menos de 5 segundos
      timeBar.style.background = 'linear-gradient(90deg, #ff4444, #cc0000)';
      timeBarContainer.style.animation = 'pulse 0.5s infinite alternate, glow 0.5s infinite alternate';
      timeBar.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.8)';
    } else if (timePercentage > 60) {
      timeBar.style.background = 'linear-gradient(90deg, #00ff88, #00ff44)';
      timeBarContainer.style.animation = 'none';
      timeBar.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.5)';
    } else if (timePercentage > 30) {
      timeBar.style.background = 'linear-gradient(90deg, #ffdd00, #ffaa00)';
      timeBarContainer.style.animation = 'none';
      timeBar.style.boxShadow = '0 0 20px rgba(255, 221, 0, 0.5)';
    } else {
      timeBar.style.background = 'linear-gradient(90deg, #ff8800, #ff5500)';
      timeBarContainer.style.animation = 'none';
      timeBar.style.boxShadow = '0 0 20px rgba(255, 136, 0, 0.5)';
    }
  };

  const checkBestChoice = (chosenOperation, otherOperation) => {
    if (isAddTimeRound) {
      // En Add-Time, el mejor es el que suma más tiempo (mayor resultado)
      return chosenOperation.result >= otherOperation.result;
    } else {
      // En Subtract-Time, el mejor es el que resta menos tiempo (mayor resultado)
      return chosenOperation.result >= otherOperation.result;
    }
  };

  const processChoice = (side) => {
    if (!gameActive || !canProcessChoice) return;
    
    canProcessChoice = false; // Prevenir múltiples selecciones
    
    const chosenOperation = side === 'left' ? leftOperation : rightOperation;
    const otherOperation = side === 'left' ? rightOperation : leftOperation;
    const chosenCard = side === 'left' ? leftCard : rightCard;
    
    const isBestChoice = checkBestChoice(chosenOperation, otherOperation);
    
    // Actualizar número central
    currentNumber = chosenOperation.result;
    
    // Feedback visual y de tiempo
    if (isBestChoice) {
      // Elección correcta
      centralNumber.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.95), rgba(0, 230, 100, 0.95))';
      centralNumber.style.boxShadow = '0 15px 35px rgba(0, 255, 136, 0.5), 0 5px 15px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4)';
      chosenCard.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.95), rgba(0, 230, 100, 0.95))';
      chosenCard.style.transform = 'scale(1.1)';
      chosenCard.style.boxShadow = '0 15px 40px rgba(0, 255, 136, 0.6), 0 5px 20px rgba(0, 0, 0, 0.3)';
      currentTicks = Math.min(currentTicks + gameConfig.difficultySettings.correctChoiceTickBonus, gameConfig.difficultySettings.maxTicks); // +3 segundos, máximo 30s
      
      console.log('¡DING! Elección correcta');
      soundCorrect.play();
      
      // Actualizar puntuación acumulada
      currentScore += gameConfig.difficultySettings.pointsPerCorrectChoice * currentLevel;

    } else {
      // Elección incorrecta
      centralNumber.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.95), rgba(220, 20, 60, 0.95))';
      centralNumber.style.boxShadow = '0 15px 35px rgba(255, 68, 68, 0.5), 0 5px 15px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4)';
      chosenCard.style.background = 'linear-gradient(135deg, rgba(255, 68, 68, 0.95), rgba(220, 20, 60, 0.95))';
      chosenCard.style.transform = 'scale(0.95)';
      centralNumber.style.transform = 'scale(1.05) rotate(3deg)';
      
      console.log('¡Error! Elección incorrecta');
      soundIncorrect.play();
    }
    
    // Verificar subida de nivel
    if (currentScore >= nextLevelScore) {
      currentLevel++;
      alpha = Math.min(alpha + gameConfig.difficultySettings.alphaIncrement, gameConfig.difficultySettings.maxAlpha); // Incrementar dificultad
      console.log(`¡Nivel ${currentLevel}!`);
      
      // Recargar tiempo y mostrar feedback
      currentTicks = gameConfig.difficultySettings.initialTicks;
      soundVictory.play();
      
      levelUpIndicator.textContent = `¡Nivel ${currentLevel}!`;
      levelUpIndicator.style.display = 'block';
      setTimeout(() => {
        levelUpIndicator.style.display = 'none';
      }, 1500); // La duración de la animación
      
      nextLevelScore += Math.floor(gameConfig.difficultySettings.levelUpScoreBase * Math.pow(gameConfig.difficultySettings.levelUpMultiplier, currentLevel - 2));
    }
    
    // Restaurar colores después de feedback
    setTimeout(() => {
      centralNumber.style.background = 'rgba(255, 255, 255, 0.9)';
      centralNumber.style.transform = 'none';
      centralNumber.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.3), 0 5px 15px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
      leftCard.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.9), rgba(255, 71, 87, 0.9))';
      leftCard.style.transform = 'scale(1)';
      leftCard.style.boxShadow = '0 12px 30px rgba(255, 107, 107, 0.4), 0 5px 15px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
      rightCard.style.background = 'linear-gradient(135deg, rgba(78, 205, 196, 0.9), rgba(69, 183, 175, 0.9))';
      rightCard.style.transform = 'scale(1)';
      rightCard.style.boxShadow = '0 12px 30px rgba(78, 205, 196, 0.4), 0 5px 15px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
      
      canProcessChoice = true; // Permitir nueva selección
      
      // Generar nueva ronda
      generateNewRound();
      updateDisplay();
    }, 800);
  };

  // Función para reiniciar el juego completamente
  const restartGame = () => {
    // Resetear todas las variables del juego
    currentNumber = gameConfig.initialNumber;
    currentScore = 0;
    nextLevelScore = gameConfig.difficultySettings.levelUpScoreBase;
    currentTicks = gameConfig.difficultySettings.initialTicks;
    currentLevel = 1;
    isAddTimeRound = true;
    leftOperation = null;
    rightOperation = null;
    gameActive = true;
    alpha = gameConfig.difficultySettings.initialAlpha;
    lastSide = null;
    canProcessChoice = true;
    
    // Restaurar elementos de la interfaz
    gameContainer.innerHTML = '';
    gameContainer.appendChild(centralNumber);
    gameContainer.appendChild(leftCard);
    gameContainer.appendChild(rightCard);
    gameContainer.style.pointerEvents = 'none'; // Desactivar clics en el contenedor del juego
    
    // Restaurar estilos originales
    centralNumber.style.background = 'rgba(255, 255, 255, 0.9)';
    centralNumber.style.transform = 'none';
    leftCard.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.9), rgba(255, 71, 87, 0.9))';
    rightCard.style.background = 'linear-gradient(135deg, rgba(78, 205, 196, 0.9), rgba(69, 183, 175, 0.9))';
    
    // Mostrar elementos que podrían estar ocultos
    gameContainer.style.display = 'flex';
    timeBarContainer.style.display = 'block';
    scoreDisplay.style.display = 'block';
    roundTypeIndicator.style.display = 'block';
    stichIndicator.style.display = 'none'; // Se mostrará cuando se detecte el ancla
    centerLine.style.display = 'block';
    detectionIndicator.style.display = 'none';
    explanationBox.style.display = 'none';
    
    // Detener animaciones
    timeBarContainer.style.animation = 'none';
    
    // Generar nueva ronda e actualizar display
    generateNewRound();
    updateDisplay();
    
    // Reiniciar el temporizador del juego
    soundBackground.currentTime = 0;
    soundBackground.play();
    startGameTimer();
    
    console.log('Juego reiniciado');
  };

  // Función para manejar la lógica del temporizador del juego
  const startGameTimer = () => {
    if (gameTimer) {
      clearInterval(gameTimer);
    }

    gameTimer = setInterval(() => {
      if (gameActive && currentTicks > 0) {
        currentTicks--;
        updateDisplay();
      } else if (currentTicks <= 0 && gameActive) {
        gameActive = false;
        clearInterval(gameTimer);
        soundBackground.pause();
        soundLose.play();
        
        // Ocultar UI del juego
        timeBarContainer.style.display = 'none';
        scoreDisplay.style.display = 'none';
        roundTypeIndicator.style.display = 'none';
        centerLine.style.display = 'none';
        stichIndicator.style.display = 'none';
        detectionIndicator.style.display = 'none';
        explanationBox.style.display = 'block';

        // Mostrar pantalla de game over con botón de reinicio mejorado
        gameContainer.style.pointerEvents = 'auto'; // Permitir clics para el botón de reinicio
        gameContainer.innerHTML = `
          <div class="glass-morphism-dark" style="
            text-align: center; 
            color: white; 
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 50px 60px;
            border-radius: 30px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
                        inset 0 2px 8px rgba(255, 255, 255, 0.1);
            animation: fadeIn 0.5s ease-out;
          ">
            <div style="font-size: 60px; margin-bottom: 20px;">🏁</div>
            <h1 style="margin: 0 0 25px 0; font-size: 42px; font-weight: 800; text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.5);">¡Juego Terminado!</h1>
            <h2 style="margin: 0 0 20px 0; color: #4ecdc4; font-size: 32px; font-weight: 700;">Puntuación Final: ${Math.floor(currentScore)}</h2>
            <h3 style="margin: 0 0 40px 0; color: #ff6b6b; font-size: 24px;">Nivel Alcanzado: ${currentLevel}</h3>
            <button id="restartBtn" class="glass-morphism" style="
              padding: 20px 40px;
              font-size: 20px;
              background: linear-gradient(135deg, #4ecdc4, #44a3aa);
              color: white;
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 25px;
              cursor: pointer;
              margin-top: 20px;
              box-shadow: 0 10px 30px rgba(78, 205, 196, 0.4),
                          inset 0 2px 4px rgba(255, 255, 255, 0.2);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            ">Jugar de Nuevo</button>
          </div>
        `;
        
        // Agregar event listener al botón de reinicio
        const restartBtn = document.getElementById('restartBtn');
        restartBtn.addEventListener('click', restartGame);
        restartBtn.addEventListener('mouseover', () => {
          restartBtn.style.transform = 'scale(1.08) translateY(-3px)';
          restartBtn.style.boxShadow = '0 15px 40px rgba(78, 205, 196, 0.6), inset 0 2px 8px rgba(255, 255, 255, 0.3)';
        });
        restartBtn.addEventListener('mouseout', () => {
          restartBtn.style.transform = 'scale(1) translateY(0)';
          restartBtn.style.boxShadow = '0 10px 30px rgba(78, 205, 196, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
        });
      }
    }, gameConfig.difficultySettings.timerInterval); // 100ms = 1 tick
  };

  // Función asíncrona para AR
  const start = async() => {
    // Inicializar MindAR
    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: arContainer,
      imageTargetSrc: '/static/assets/targets/carnet.mind',
    });
    const {renderer, scene, camera} = mindarThree;

    // Añadir luz
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Cargar modelo de stitch
    const raccoon = await loadGLTF('/static/assets/models/stitch/stitch.gltf');
    raccoon.scene.scale.set(1, 1, 1);
    raccoon.scene.position.set(0, -0.4, 0);
    raccoon.scene.rotation.set(0, -Math.PI/2, 0);


    // Crear ancla
    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(raccoon.scene);

    // Variables para el control del indicador de detección
    let detectionTimer = null;
    let isAnchorVisible = false;

    // Función para detectar posición de la stitch
    const detectStichPosition = () => {
      if (anchor.group.visible && gameActive) {
        stichIndicator.style.display = 'block';
        
        // Ocultar el indicador de detección si está visible
        if (detectionTimer) {
          clearTimeout(detectionTimer);
          detectionTimer = null;
        }
        detectionIndicator.style.display = 'none';
        isAnchorVisible = true;
        
        // Obtener posición en pantalla del objeto
        const vector = new THREE.Vector3();
        anchor.group.getWorldPosition(vector);
        vector.project(camera);
        
        // Convertir a coordenadas de pantalla
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const threshold = window.innerWidth * 0.2; // 20% de la pantalla (para crear proporción 1/2/2)
        
        // Determinar el lado solo si está fuera del threshold central
        let currentSide = null;
        if (x < threshold) {
          currentSide = 'right'; // Recordar que la cámara está invertida
        } else if (x > window.innerWidth - threshold) {
          currentSide = 'left'; // Recordar que la cámara está invertida
        }
        
        // Solo procesar si hay un lado definido y cambió
        if (currentSide && currentSide !== lastSide && canProcessChoice) {
          console.log(`stitch detectado en: ${currentSide}`);
          lastSide = currentSide;
          
          // Procesar elección automáticamente después de un breve delay
          setTimeout(() => {
            if (currentSide === lastSide && canProcessChoice) {
              processChoice(currentSide);
            }
          }, gameConfig.choiceConfirmationDelay); // 500ms de delay para confirmar la posición
        } else if (!currentSide && lastSide) {
          // Si volvió al centro, resetear lastSide
          lastSide = null;
          console.log('Stitch en zona neutral');
        }
        
        // Actualizar indicador visual
        if (currentSide) {
          stichIndicator.innerHTML = `<span style="font-size: 24px; margin-right: 10px;">${currentSide === 'left' ? '⬅️' : '➡️'}</span>Stitch en: ${currentSide.toUpperCase()}`;
          stichIndicator.style.borderColor = currentSide === 'left' ? 'rgba(255, 107, 107, 0.5)' : 'rgba(78, 205, 196, 0.5)';
          stichIndicator.style.background = currentSide === 'left' ? 
            'linear-gradient(135deg, rgba(255, 107, 107, 0.3), rgba(255, 71, 87, 0.3))' : 
            'linear-gradient(135deg, rgba(78, 205, 196, 0.3), rgba(69, 183, 175, 0.3))';
          stichIndicator.style.boxShadow = currentSide === 'left' ?
            '0 8px 32px rgba(255, 107, 107, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)' :
            '0 8px 32px rgba(78, 205, 196, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)';
        } else {
          // En zona neutral
          stichIndicator.innerHTML = `<span style="font-size: 24px; margin-right: 10px;">🎯</span>Mueve más a los lados para elegir`;
          stichIndicator.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          stichIndicator.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.2))';
          stichIndicator.style.boxShadow = '0 8px 32px rgba(255, 255, 255, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.1)';
        }
      } else {
        stichIndicator.style.display = 'none';
        lastSide = null;
        
        // Si se pierde el ancla y el juego está activo
        if (gameActive && isAnchorVisible) {
          isAnchorVisible = false;
          // Mostrar el indicador después de 3 segundos
          detectionTimer = setTimeout(() => {
            if (!isAnchorVisible && gameActive) {
              detectionIndicator.style.display = 'block';
            }
          }, 3000);
        }
      }
    };

    // Iniciar AR
    await mindarThree.start();
    
    // Iniciar el temporizador del juego
    startGameTimer();
    // camera.projectionMatrix.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));

    // Bucle de renderizado
    renderer.setAnimationLoop(() => {
      detectStichPosition();
      renderer.render(scene, camera);
    });
  };

  // Agregar estilo de animación para el pulso
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      from { transform: translateX(-50%) scale(1); }
      to { transform: translateX(-50%) scale(1.05); }
    }
    
    /* Efectos hover para las cartas */
    @media (hover: hover) {
      .card-hover:hover {
        transform: scale(1.08) translateY(-5px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3),
                    0 10px 20px rgba(0, 0, 0, 0.2),
                    inset 0 2px 8px rgba(255, 255, 255, 0.3);
      }
    }
  `;
  document.head.appendChild(style);
  
  // Añadir clases para hover
  leftCard.classList.add('card-hover');
  rightCard.classList.add('card-hover');

  // Función para mostrar la pantalla de inicio
  const showStartScreen = () => {
    const startScreen = document.createElement('div');
    startScreen.id = 'startScreen';
    startScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      z-index: 2000;
      padding: 20px;
      overflow: hidden;
    `;
    
    // Añadir partículas animadas de fondo
    const particles = document.createElement('div');
    particles.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -1;
    `;
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 6 + 2}px;
        height: ${Math.random() * 6 + 2}px;
        background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float ${Math.random() * 10 + 5}s infinite ease-in-out;
        animation-delay: ${Math.random() * 5}s;
      `;
      particles.appendChild(particle);
    }
    startScreen.appendChild(particles);

    startScreen.innerHTML += `
      <div class="glass-morphism" style="
        padding: 50px 60px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
                    inset 0 2px 8px rgba(255, 255, 255, 0.1);
        animation: fadeIn 0.8s ease-out;
        max-width: 90%;
      ">
        <div style="font-size: 80px; margin-bottom: 20px; animation: float 3s infinite ease-in-out;">🤖</div>
        <h1 style="font-size: 56px; margin-bottom: 20px; color: #4ecdc4; text-shadow: 3px 3px 8px rgba(0,0,0,0.6); font-weight: 800; letter-spacing: 2px;">SwipeMath AR</h1>
        <h2 style="font-size: 24px; margin-bottom: 35px; font-weight: 400; color: #ecf0f1; opacity: 0.9;">El reto matemático con Realidad Aumentada</h2>
        <p style="font-size: 18px; max-width: 600px; margin-bottom: 45px; line-height: 1.8; color: rgba(255, 255, 255, 0.85);">
          Apunta tu cámara al <strong style="color: #4ecdc4;">marcador de Stitch</strong> para que aparezca en tu mundo.
          <br/>
          Mueve la tarjeta para elegir la operación que te dé el <strong style="color: #ff6b6b;">mejor resultado</strong> y suma puntos antes de que el tiempo se agote.
        </p>
        <button id="startGameBtn" class="glass-morphism" style="
          padding: 25px 50px;
          font-size: 26px;
          background: linear-gradient(135deg, #4ecdc4, #44a3aa);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 35px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 15px 40px rgba(78, 205, 196, 0.5),
                      inset 0 2px 4px rgba(255, 255, 255, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 2px;
          animation: glow 2s infinite;
        ">Empezar a Jugar</button>
      </div>
    `;
    document.body.appendChild(startScreen);

    const startBtn = document.getElementById('startGameBtn');
    startBtn.addEventListener('click', () => {
      startScreen.style.display = 'none';
      // Mostrar la UI del juego
      gameContainer.style.display = 'flex';
      timeBarContainer.style.display = 'block';
      scoreDisplay.style.display = 'block';
      roundTypeIndicator.style.display = 'block';
      centerLine.style.display = 'block';
      detectionIndicator.style.display = 'block';
      explanationBox.style.display = 'block';
      
      // Inicializar juego y AR
      generateNewRound();
      updateDisplay();
      soundBackground.play();
      start();
    });

    startBtn.addEventListener('mouseover', () => { 
        startBtn.style.transform = 'scale(1.08) translateY(-4px)'; 
        startBtn.style.boxShadow = '0 20px 50px rgba(78, 205, 196, 0.7), inset 0 2px 8px rgba(255, 255, 255, 0.4)';
        startBtn.style.animation = 'none';
    });
    startBtn.addEventListener('mouseout', () => { 
        startBtn.style.transform = 'scale(1) translateY(0)'; 
        startBtn.style.boxShadow = '0 15px 40px rgba(78, 205, 196, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        startBtn.style.animation = 'glow 2s infinite';
    });
  };

  // Mostrar la pantalla de inicio al cargar la página
  showStartScreen();
  
  console.log('SwipeMath con AR listo. Presiona el botón para comenzar.');
});
