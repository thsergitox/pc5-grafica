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
  // CONFIGURACIÓN DEL JUEGO (Ajusta estos valores para cambiar la dificultad)
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
      levelUpScoreBase: 1000, // Puntuación base para subir de nivel.
      timerInterval: 100,     // Velocidad del temporizador en ms (100ms = 1 tick).

      // --- Lógica de Dificultad ---
      initialAlpha: 1,        // Factor de dificultad inicial (afecta a la cercanía de los resultados). Más bajo = más fácil.
      alphaIncrement: 0.5,    // Cuánto aumenta la dificultad por nivel.
      maxAlpha: 5,            // Dificultad máxima.

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
  timeBarContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 25px;
    background-color: rgba(255, 255, 255, 0.3);
    border: 3px solid white;
    border-radius: 15px;
    z-index: 1001;
    display: none; /* Oculto inicialmente */
  `;
  
  const timeBar = document.createElement('div');
  timeBar.style.cssText = `
    width: 100%;
    height: 100%;
    background-color: #00ff00;
    border-radius: 12px;
    transition: width 0.1s ease, background-color 0.3s ease;
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
  scoreDisplay.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 20px;
    font-weight: bold;
    text-shadow: 2px 2px 4px black;
    z-index: 1001;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 10px 20px;
    border-radius: 10px;
    display: none; /* Oculto inicialmente */
  `;

  // Número central con fondo semitransparente
  const centralNumber = document.createElement('div');
  centralNumber.style.cssText = `
    width: 120px;
    height: 120px;
    background: rgba(255, 255, 255, 0.9);
    border: 3px solid white;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: bold;
    color: #333;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    transition: transform 0.2s ease, background-color 0.3s ease;
  `;

  // Carta izquierda con fondo semitransparente
  const leftCard = document.createElement('div');
  leftCard.style.cssText = `
    position: absolute;
    left: 20%;
    width: 100px;
    height: 100px;
    background: rgba(255, 107, 107, 0.9);
    border: 3px solid white;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: white;
    box-shadow: 0 8px 25px rgba(0,0,0,0.5);
    transition: transform 0.2s ease, background-color 0.3s ease;
  `;

  // Carta derecha con fondo semitransparente
  const rightCard = document.createElement('div');
  rightCard.style.cssText = `
    position: absolute;
    right: 20%;
    width: 100px;
    height: 100px;
    background: rgba(78, 205, 196, 0.9);
    border: 3px solid white;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: white;
    box-shadow: 0 8px 25px rgba(0,0,0,0.5);
    transition: transform 0.2s ease, background-color 0.3s ease;
  `;

  // Indicador de tipo de ronda
  const roundTypeIndicator = document.createElement('div');
  roundTypeIndicator.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border: 2px solid white;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    z-index: 1001;
    display: none; /* Oculto inicialmente */
  `;

  // Indicador de detección de silla
  const stichIndicator = document.createElement('div');
  stichIndicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border: 2px solid white;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    z-index: 1001;
    display: none;
  `;
  stichIndicator.textContent = 'Mueve la silla para elegir';

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
  detectionIndicator.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border: 3px solid rgb(255, 255, 255);
    border-radius: 15px;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    z-index: 1001;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 5px 20px rgba(0,0,0,0.4);
  `;
  detectionIndicator.textContent = 'Coloca la tarjeta en el centro para detectar a Stitch, en el lado que corresponda';

  // Caja de explicación del juego
  const explanationBox = document.createElement('div');
  explanationBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    padding: 15px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border: 2px solid white;
    border-radius: 10px;
    font-size: 14px;
    font-weight: bold;
    text-align: left;
    z-index: 1001;
    max-width: 250px;
    display: none; /* Oculto inicialmente */
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  explanationBox.innerHTML = `
    <strong>Objetivo:</strong> Elige la operación que dé el mejor resultado.
    <br/><br/>
    <strong>Control:</strong> Mueve a Stitch (con la tarjeta) hacia la izquierda o derecha para seleccionar.
  `;
  document.body.appendChild(explanationBox);

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
    // Lógica mejorada para que las opciones sean más competitivas
    const Y = Math.floor(Math.random() * (gameConfig.difficultySettings.addTimeRound_Y_MaxBase + currentLevel * gameConfig.difficultySettings.addTimeRound_Y_LevelMultiplier)) + 1;
    const resultAdd = currentNumber + Y;

    // Calcular un multiplicador Z que dé un resultado cercano a la suma
    // El rango de aleatoriedad se ajusta con 'alpha' (dificultad)
    const idealMultiplier = resultAdd / currentNumber;
    const randomFactor = (Math.random() - 0.5) * alpha; // Rango de [-alpha/2, alpha/2]
    let Z = Math.round(idealMultiplier + randomFactor);
    Z = Math.max(2, Z); // Asegurarse de que Z sea al menos 2

    leftOperation = { type: 'multiply', value: Z, result: currentNumber * Z };
    rightOperation = { type: 'add', value: Y, result: resultAdd };
    
    leftCard.textContent = `× ${Z}`;
    rightCard.textContent = `+ ${Y}`;
    roundTypeIndicator.textContent = 'Ronda: SUMA vs MULTIPLICACIÓN';
    roundTypeIndicator.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
  };

  const generateSubtractTimeRound = () => {
    // Lógica mejorada para que las opciones sean más competitivas
    const maxY = Math.min(currentNumber - 1, gameConfig.difficultySettings.subtractTimeRound_Y_MaxBase + currentLevel * gameConfig.difficultySettings.subtractTimeRound_Y_LevelMultiplier);
    if (maxY < 1) { // Si no se puede restar, forzar una ronda de suma
        generateAddTimeRound();
        isAddTimeRound = false; // Para que la siguiente sea de resta
        return;
    }
    const Y = Math.floor(Math.random() * maxY) + 1;
    const resultSubtract = currentNumber - Y;

    // Calcular un divisor Z que dé un resultado cercano a la resta
    const idealDivisor = resultSubtract > 0 ? currentNumber / resultSubtract : 2;
    const randomFactor = (Math.random() - 0.5) * alpha;
    let Z = Math.round(idealDivisor + randomFactor);
    Z = Math.max(2, Z); // Asegurarse de que Z sea al menos 2

    leftOperation = { type: 'divide', value: Z, result: Math.floor(currentNumber / Z) };
    rightOperation = { type: 'subtract', value: Y, result: resultSubtract };
    
    leftCard.textContent = `÷ ${Z}`;
    rightCard.textContent = `− ${Y}`;
    roundTypeIndicator.textContent = 'Ronda: RESTA vs DIVISIÓN';
    roundTypeIndicator.style.backgroundColor = 'rgba(128, 0, 0, 0.8)';
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
      timeBar.style.backgroundColor = '#ff0000';
      timeBarContainer.style.animation = 'pulse 0.5s infinite alternate';
    } else if (timePercentage > 60) {
      timeBar.style.backgroundColor = '#00ff00';
      timeBarContainer.style.animation = 'none';
    } else if (timePercentage > 30) {
      timeBar.style.backgroundColor = '#ffff00';
      timeBarContainer.style.animation = 'none';
    } else {
      timeBar.style.backgroundColor = '#ff6600';
      timeBarContainer.style.animation = 'none';
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
      centralNumber.style.backgroundColor = 'rgba(0, 255, 0, 0.9)';
      chosenCard.style.backgroundColor = 'rgba(0, 255, 0, 0.9)';
      currentTicks = Math.min(currentTicks + gameConfig.difficultySettings.correctChoiceTickBonus, gameConfig.difficultySettings.maxTicks); // +3 segundos, máximo 30s
      
      console.log('¡DING! Elección correcta');
      soundCorrect.play();
    } else {
      // Elección incorrecta
      centralNumber.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
      chosenCard.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
      centralNumber.style.transform = 'scale(1.1)';
      
      console.log('¡Error! Elección incorrecta');
      soundIncorrect.play();
    }
    
    // Actualizar puntuación
    currentScore = currentTicks;
    
    // Verificar subida de nivel
    if (currentScore >= gameConfig.difficultySettings.levelUpScoreBase * currentLevel) {
      currentLevel++;
      alpha = Math.min(alpha + gameConfig.difficultySettings.alphaIncrement, gameConfig.difficultySettings.maxAlpha); // Incrementar dificultad
      console.log(`¡Nivel ${currentLevel}!`);
      soundVictory.play();
    }
    
    // Restaurar colores después de feedback
    setTimeout(() => {
      centralNumber.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      centralNumber.style.transform = 'none';
      leftCard.style.backgroundColor = 'rgba(255, 107, 107, 0.9)';
      rightCard.style.backgroundColor = 'rgba(78, 205, 196, 0.9)';
      
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
    centralNumber.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    centralNumber.style.transform = 'none';
    leftCard.style.backgroundColor = 'rgba(255, 107, 107, 0.9)';
    rightCard.style.backgroundColor = 'rgba(78, 205, 196, 0.9)';
    
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
          <div style="
            text-align: center; 
            color: white; 
            background-color: rgba(0, 0, 0, 0.8);
            padding: 40px;
            border-radius: 20px;
            border: 3px solid white;
          ">
            <h1 style="margin: 0 0 20px 0; font-size: 36px;">¡Juego Terminado!</h1>
            <h2 style="margin: 0 0 15px 0; color: #4ecdc4;">Puntuación Final: ${currentScore}</h2>
            <h3 style="margin: 0 0 30px 0; color: #ff6b6b;">Nivel Alcanzado: ${currentLevel}</h3>
            <button id="restartBtn" style="
              padding: 15px 30px;
              font-size: 18px;
              background: #4ecdc4;
              color: white;
              border: none;
              border-radius: 10px;
              cursor: pointer;
              margin-top: 20px;
              box-shadow: 0 5px 15px rgba(0,0,0,0.3);
              transition: transform 0.2s ease;
            ">Jugar de Nuevo</button>
          </div>
        `;
        
        // Agregar event listener al botón de reinicio
        const restartBtn = document.getElementById('restartBtn');
        restartBtn.addEventListener('click', restartGame);
        restartBtn.addEventListener('mouseover', () => {
          restartBtn.style.transform = 'scale(1.05)';
        });
        restartBtn.addEventListener('mouseout', () => {
          restartBtn.style.transform = 'scale(1)';
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

    // Cargar modelo de silla
    const raccoon = await loadGLTF('/static/assets/models/stitch/stitch.gltf');
    raccoon.scene.scale.set(1, 1, 1);
    raccoon.scene.position.set(0, -0.4, 0);
    raccoon.scene.rotation.set(0, -Math.PI/2, 0);


    // Crear ancla
    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(raccoon.scene);

    // Función para detectar posición de la silla
    const detectStichPosition = () => {
      if (anchor.group.visible && gameActive) {
        stichIndicator.style.display = 'block';
        detectionIndicator.style.display = 'none'; // Ocultar mensaje inicial
        
        // Obtener posición en pantalla del objeto
        const vector = new THREE.Vector3();
        anchor.group.getWorldPosition(vector);
        vector.project(camera);
        
        // Convertir a coordenadas de pantalla
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const centerX = window.innerWidth / 2;
        
        const currentSide = x > centerX ? 'left' : 'right';
        
        // Solo procesar si cambió de lado
        if (currentSide !== lastSide && canProcessChoice) {
          console.log(`Silla detectada en: ${currentSide}`);
          lastSide = currentSide;
          
          // Procesar elección automáticamente después de un breve delay
          setTimeout(() => {
            if (currentSide === lastSide && canProcessChoice) {
              processChoice(currentSide);
            }
          }, gameConfig.choiceConfirmationDelay); // 500ms de delay para confirmar la posición
        }
        
        // Actualizar indicador visual
        stichIndicator.textContent = `Silla en: ${currentSide.toUpperCase()}`;
        stichIndicator.style.borderColor = currentSide === 'left' ? '#ff6b6b' : '#4ecdc4';
        stichIndicator.style.backgroundColor = currentSide === 'left' ? 
          'rgba(255, 107, 107, 0.8)' : 'rgba(78, 205, 196, 0.8)';
      } else {
        stichIndicator.style.display = 'none';
        lastSide = null;
        if (gameActive) {
          detectionIndicator.style.display = 'block'; // Mostrar si se pierde el ancla
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
  `;
  document.head.appendChild(style);

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
      background: linear-gradient(45deg, #2c3e50, #34495e);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      z-index: 2000;
      padding: 20px;
      font-family: 'Arial', sans-serif;
    `;

    startScreen.innerHTML = `
      <h1 style="font-size: 52px; margin-bottom: 15px; color: #4ecdc4; text-shadow: 2px 2px 5px rgba(0,0,0,0.5);">SwipeMath AR</h1>
      <h2 style="font-size: 22px; margin-bottom: 30px; font-weight: normal; color: #ecf0f1;">El reto matemático con Realidad Aumentada</h2>
      <p style="font-size: 18px; max-width: 600px; margin-bottom: 40px; line-height: 1.6; color: #bdc3c7;">
        Apunta tu cámara al <strong>marcador de Stitch</strong> para que aparezca en tu mundo.
        <br/>
        Mueve la tarjeta para elegir la operación que te dé el <strong>mejor resultado</strong> y suma puntos antes de que el tiempo se agote.
      </p>
      <button id="startGameBtn" style="
        padding: 20px 40px;
        font-size: 24px;
        background: #4ecdc4;
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">Empezar a Jugar</button>
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
        startBtn.style.transform = 'scale(1.05)'; 
        startBtn.style.boxShadow = '0 12px 30px rgba(0,0,0,0.5)';
    });
    startBtn.addEventListener('mouseout', () => { 
        startBtn.style.transform = 'scale(1)'; 
        startBtn.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
    });
  };

  // Mostrar la pantalla de inicio al cargar la página
  showStartScreen();
  
  console.log('SwipeMath con AR listo. Presiona el botón para comenzar.');
});
