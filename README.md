# SwipeMath AR

Un juego educativo de matemáticas en Realidad Aumentada.

Miembro Integrantes:

- Sergio Sebastian Pezo Jimenez
- Arbues Enrique Perez Villegas
- Andre Joaquin Pacheco Taboada
- Jared Aristóteles Orihuela Contreras


## Descripción

SwipeMath AR es un videojuego interactivo diseñado para niños que combina el aprendizaje de matemáticas con la tecnología de Realidad Aumentada (AR). El objetivo es resolver operaciones matemáticas de forma rápida y precisa para obtener la mayor puntuación posible. La interacción principal se realiza moviendo un marcador AR físico para seleccionar las respuestas.

## Cómo Jugar

1.  **Inicia el Juego:** Abre la aplicación y presiona "Empezar a Jugar".
2.  **Apunta al Marcador:** Utiliza la cámara de tu dispositivo para enfocar el marcador de AR (la imagen designada). Verás cómo el personaje 3D de Stitch cobra vida sobre la tarjeta.
3.  **Elige la Operación:** En la pantalla aparecerán dos operaciones matemáticas. Mueve físicamente la tarjeta del marcador hacia la izquierda o la derecha para que Stitch se posicione sobre la operación que creas que da el mejor resultado.
    *   **Rondas de Suma/Multiplicación:** Elige el resultado más alto.
    *   **Rondas de Resta/División:** Elige el resultado que te deje con un número más alto (la menor penalización).
4.  **Acumula Puntos:** Gana tiempo y puntos por cada respuesta correcta. ¡Sé rápido, el tiempo se agota!

## Tecnologías Utilizadas

*   **MindAR.js:** Para el reconocimiento de imágenes y las capacidades de Realidad Aumentada.
*   **Three.js:** Para el renderizado y la manipulación de la escena y los modelos 3D.
*   **Flask:** Un microframework de Python utilizado para servir la aplicación web.

## Instalación y Uso

Para ejecutar este proyecto localmente, sigue estos pasos:

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/thsergitox/pc5-grafica
    cd pc5-grafica
    ```

2.  Crea un entorno virtual e instala las dependencias:
    ```bash
    python -m venv venv
    source venv/bin/activate  # En Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  Ejecuta la aplicación:
    ```bash
    python main.py
    ```

4.  Abre tu navegador y ve a `http://127.0.0.1:5000` (o la dirección que indique la consola).