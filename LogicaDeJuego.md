# Lógica Matemática de SwipeMath AR

Aquí se detalla la lógica matemática que impulsa la dificultad y la progresión del juego SwipeMath AR.

---

### 1. El Dilema: Operaciones Siempre Competitivas

El problema a resolver era que, con números grandes, `multiplicar` siempre era mejor que `sumar`, y `restar` siempre era mejor que `dividir`. La solución fue hacer que la operación "débil" (suma/resta) genere un número que compita directamente con la "fuerte" (multiplicación/división).

**Variables:**
*   \(N\): El número actual en el centro de la pantalla.
*   \(α\): El factor de dificultad (un número pequeño que aumenta con cada nivel).

#### **Ronda de SUMA vs. MULTIPLICACIÓN**

El objetivo es que los resultados de \(N \times Z\) y \(N + Y\) sean muy parecidos.

1.  **Se elige un multiplicador (Z):** Se escoge un número entero bajo y aleatorio.
    \[ Z \in \{2, 3\} \]

2.  **Se calcula el sumando ideal (Y_ideal):** Para que los resultados fueran idénticos, la fórmula sería \(N+Y = N \times Z\). Despejando Y, obtenemos el valor ideal:
    \[ Y_{ideal} = N \times (Z - 1) \]

3.  **Se introduce el caos (Factor Aleatorio):** Se ajusta \(Y_{ideal}\) con un pequeño factor aleatorio que depende de la dificultad \(\alpha\).
    \[ Y_{final} = \lfloor Y_{ideal} \times (1 + \text{FactorAleatorio}_\alpha) \rfloor \]

#### **Ronda de RESTA vs. DIVISIÓN**

El objetivo es similar: que los resultados de \(N \div Z\) y \(N - Y\) sean muy parecidos.

1.  **Se elige un divisor (Z):** Se escoge un número entero bajo y aleatorio.
    \[ Z \in \{2, 3, 4\} \]

2.  **Se calcula el sustraendo ideal (Y_ideal):** Para que los resultados fueran idénticos, la fórmula sería \(N-Y = N \div Z\). Despejando Y, obtenemos:
    \[ Y_{ideal} = N \times (1 - \frac{1}{Z}) \]

3.  **Se introduce el caos (Factor Aleatorio):** Se aplica la misma lógica que en la ronda de suma.
    \[ Y_{final} = \lfloor Y_{ideal} \times (1 + \text{FactorAleatorio}_\alpha) \rfloor \]

---

### 2. El Ingrediente Secreto: El Factor Aleatorio (\(\text{FactorAleatorio}_\alpha\))

Este es el corazón de la imprevisibilidad del juego. Su función es crear una "ventana de incertidumbre" alrededor del valor ideal (\(Y_{ideal}\)) para que el jugador nunca esté 100% seguro de cuál es la mejor opción.

La fórmula para este factor es:

\[ \text{FactorAleatorio}_\alpha = (\text{random} - 0.5) \times \alpha \]

Donde:
*   **\(\text{random}\):** Es un número decimal aleatorio entre 0 y 1 (excluyendo el 1).
*   **\(\alpha\):** Es el factor de dificultad del nivel actual.

#### **¿Cómo Funciona?**

1.  **`random - 0.5`**: Esta parte genera un número aleatorio en un rango simétrico alrededor de cero: de **-0.5 a +0.5**. Esto es clave para que la aleatoriedad no tenga un sesgo y pueda tanto aumentar como disminuir el valor de \(Y_{ideal}\).

2.  **`(...) * α`**: Multiplicamos ese rango por el factor de dificultad \(\alpha\). Esto hace que la "ventana de incertidumbre" crezca a medida que el jugador suba de nivel.

**Ejemplo Práctico:**

*   **Nivel 1 (\(\alpha = 0.8\)):** El rango del factor aleatorio es `[-0.4, 0.4]`. Esto significa que \(Y_{final}\) será un valor entre el **60%** y el **140%** de \(Y_{ideal}\). La elección es difícil, pero relativamente contenida.

*   **Nivel Máximo (\(\alpha = 1.5\)):** El rango del factor aleatorio es `[-0.75, 0.75]`. Ahora, \(Y_{final}\) puede ser un valor entre el **25%** y el **175%** de \(Y_{ideal}\). La incertidumbre es mucho mayor, haciendo las decisiones increíblemente más desafiantes.

En resumen, este factor asegura que el juego siga siendo un reto de cálculo mental rápido y no de reconocimiento de patrones, escalando la dificultad de una forma justa pero impredecible.

---

### 3. La Escalada: Curva de Nivel Exponencial

Para evitar que subir de nivel sea monótono, el coste en puntos para alcanzar el siguiente nivel crece de forma exponencial.

**Variables:**
*   \(P_{base}\): La puntuación base para subir al nivel 2 (500).
*   \(M\): El multiplicador de dificultad (1.5).
*   \(P_{Nivel_L}\): La puntuación total necesaria para alcanzar el nivel \(L\).

**Fórmula de Progresión:**

La puntuación necesaria para el siguiente nivel se calcula a partir del requisito del nivel anterior:

\[ P_{Nivel_{L+1}} = P_{Nivel_L} + (P_{base} \times M^{L-1}) \]

Esto garantiza que cada nuevo nivel sea un logro significativamente más difícil que el anterior.
