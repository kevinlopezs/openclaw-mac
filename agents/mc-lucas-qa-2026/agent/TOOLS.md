# TOOLS.md — Local Notes

Tienes acceso a herramientas MCP potentes para tu trabajo de QA, tanto para iOS como para Android (emuladores, simuladores o dispositivos físicos) y la gestión de reportes de errores en GitHub.

**Regla general de honestidad:** Solo puedes decir que hiciste algo en un emulador (abrir app, escribir texto, grabar video, subir a Bunny, etc.) si ACABAS de ejecutar las tools correspondientes (MCP o Shell) y viste su resultado. Si por alguna razón no puedes ejecutar las tools, debes decir que _no pudiste completar la acción_, no inventar que está hecha ni fabricar URLs o rutas.

## Herramientas Móviles (`mobile_*`)

Estás conectado al servidor MCP `mobile-next` que te permite interactuar directamente con aplicaciones móviles **solo para interacción y screenshots**, NO para grabación de video:

- Instalar/desinstalar apps (`mobile_mobile_install_app`, `mobile_mobile_uninstall_app`)
- Iniciar apps (`mobile_mobile_launch_app`)
- **Nombres críticos (exactos):**
  - `mobile_mobile_list_available_devices`
  - `mobile_mobile_list_apps`
  - `mobile_mobile_launch_app`
- Interacciones directas (`mobile_mobile_click_on_screen_at_coordinates`, `mobile_mobile_swipe_on_screen`, `mobile_mobile_type_keys`, etc.)
- Capturas de pantalla (`mobile_mobile_take_screenshot`) y listas de elementos (`mobile_mobile_list_elements_on_screen`)
- **NO uses jamás** `mobile_mobile_start_screen_recording` ni `mobile_mobile_stop_screen_recording`. Considéralas deshabilitadas, aunque aparezcan en la lista de tools.

### Abrir la app (Android) usando MCP (obligatorio)

Cuando el usuario te pida “abrir” una app o “entrar a Manteniclic” en Android durante un flujo de QA, debes hacerlo SIEMPRE con MCP:

1. Lista dispositivos: llama `mobile_mobile_list_available_devices` (Tool) para obtener el `deviceId` activo.
2. Lista apps en ese `deviceId`: llama `mobile_mobile_list_apps` con `device` y encuentra el `packageName` de Manteniclic.
3. Lanza Manteniclic: llama `mobile_mobile_launch_app` usando el `device` y el `packageName` obtenido.

Reglas duras:

- Identificador Android = `packageName` (NO “bundle ID”).
- Si `mobile_mobile_list_apps` o `mobile_mobile_launch_app` fallan (no tool found o error real), **no uses adb como alternativa para lanzar**: debes parar y reportar el error exacto de la tool.
- **No uses `exec`/terminal para invocar** `mobile_mobile_list_apps` ni `mobile_mobile_launch_app`. Si te aparece “command not found”, es porque fue invocado como comando y debes corregirlo a invocación como tool MCP.
- Si recibes un error de tipo “tool not found” o “no se encuentra la herramienta”, asume que el nombre que intentaste usar no coincide. Vuelve a usar estrictamente los **nombres críticos exactos** listados arriba.

**¡ATENCIÓN SOBRE NOMBRES DE MCP!:** Las herramientas inyectadas tienen el prefijo `mobile_mobile_` (con "mobile" repetido, por ejemplo `mobile_mobile_list_available_devices`). Esto es normal. Usa **siempre** el prefijo doble tal como aparece en tu esquema del sistema.
**ESTAS SON LLM TOOLS, NO COMANDOS DE BASH:** Invoca la tool MCP por su nombre exacto (por ejemplo `mobile_mobile_list_available_devices`) como una _llamada de herramienta_, y **NUNCA** la pegues como texto dentro del parámetro `command` de `exec`.
**PROHIBIDO (para evitar el error que viste):** Nunca uses `exec`, `bash` o cualquier comando de terminal para “llamar” a herramientas `mobile_mobile_*`. Esas herramientas deben invocarse únicamente como herramientas MCP (por su nombre exacto) y no como “comandos”.
**INTERACCIÓN OBLIGATORIA VIA MCP:** Siempre que el usuario te pida que _hagas algo dentro de la app_ (abrir Manteniclic, escribir en el chat, navegar pantallas, etc.), debes usar solo las tools `mobile_mobile_*` para lograrlo y luego describir lo que viste. No puedes “simular” el flujo solo con texto.

## Herramientas GitHub (`github_*`)

Cuando encuentres un bug reproducible, usa estas herramientas para reportarlo:

- `github_create_issue`: Usa esta herramienta para abrir un ticket detallando el bug (incluye pasos, comportamiento esperado, logs, etc.).
- `github_add_issue_comment`: Si estás revisando un ticket existente o haciendo seguimiento a una corrección de Francisco, añade tus hallazgos aquí.

## Grabación de Video en Simulador iOS (Workaround OBLIGATORIO)

El servidor MCP `mobile_*` falla al guardar o finalizar los videos del simulador de iOS correctamente.
**NO uses ninguna herramienta MCP de grabación de video para iOS (`mobile_mobile_start_screen_recording`, `mobile_mobile_stop_screen_recording`, ni variantes).** Siempre que quieras grabar evidencia en video de la pantalla de iOS, **debes usar herramientas de ejecución de comandos (Shell/Terminal)** con el comando nativo `xcrun simctl` en lugar del MCP de video.

**Instrucciones precisas para grabar video en iOS sin que el proceso crashee:**

1. **Iniciar grabación (en segundo plano y sin depender del TTY):** Como estás en un entorno sin terminal interactiva, comandos como `recordVideo` suelen morir instantáneamente si los lanzas con un simple `&`. DEBES usar `nohup`, el flag `--mask=ignored` (crítico para simuladores modernos) y redirigir la salida. Ejecuta SIEMPRE esto con tu herramienta Shell y captura el PID. Cada vez que el usuario te pida “grabar video”, “hacer una grabación de pantalla” o algo equivalente en lenguaje natural (sin mencionar explícitamente `mobile_mobile_start_screen_recording`), DEBES interpretar esa petición como ejecutar exactamente este comando:
   ```bash
   nohup xcrun simctl io booted recordVideo --mask=ignored ~/Desktop/QA_bug_$(date +%Y%m%d_%H%M%S).mp4 > /dev/null 2>&1 & echo $!
   ```
2. **Realizar pruebas:** Continúa usando las herramientas `mobile_*` para interactuar con la app y reproducir el bug.
3. **Detener grabación correctamente:** **Nunca** uses SIGKILL. Debes enviar `SIGINT` (simula Control+C) para que el MP4 se guarde correctamente. Si no puedes enviar `SIGINT` o el comando falla, DEBES decir explícitamente que la grabación pudo no haberse guardado, en lugar de asumir que el archivo existe.

   ```bash
   kill -SIGINT <PID>
   ```

   _(Donde `<PID>` es el número que devolvió el primer comando)._
   Espera 2-3 segundos adicionales después del kill para asegurar que el archivo terminó de escribirse antes de intentar leerlo o reportarlo.

4. **Verificación antes de reportar:** Antes de afirmar que “el video existe” o dar una ruta específica, DEBES verificar con Shell/exec (por ejemplo `ls ~/Desktop/QA_bug_*.mp4`) que el archivo realmente está presente. Si no lo encuentras, di que la grabación falló en lugar de inventar una ruta.

5. **Al reportar un bug con video:** Incluye SIEMPRE en tu mensaje:
   - El comando exacto que usaste.
   - El PID devuelto por `echo $!`.
   - El comando de verificación que ejecutaste (`ls ...`) y su salida.
   - La ruta completa del archivo `.mp4` generado **solo si la verificación confirmó que existe**.

## Grabación de Video en Android (ADB `screenrecord`)

Para Android, **no dependas de MCP para grabar video**. Usa siempre `adb screenrecord` con el mismo enfoque robusto que en iOS, guardando el resultado en tu Escritorio.

**Regla dura (obligatoria):**

- **Nunca** uses `mobile_mobile_start_screen_recording` ni `mobile_mobile_stop_screen_recording` para grabar video en Android, aunque “parezcan” disponibles como tools.
- Cuando el usuario pida “grabar video” en Android, **no** esperes a que el usuario te diga cuándo parar. Usa siempre `--time-limit` y continúa con `adb pull`, verificación `ls` y el upload a Bunny.
- Si el usuario pide una duración distinta, usa ese valor para `--time-limit`. Si no se especifica, usa `180`.

Usa SIEMPRE la ruta absoluta de `adb` para no depender del `PATH` del gateway:
`/Users/kevinlopez/Library/Android/sdk/platform-tools/adb`

1. **Iniciar grabación en el dispositivo Android** usando `adb screenrecord` y guardando el archivo en el dispositivo (por ejemplo, en `/sdcard`):

   ```bash
   /Users/kevinlopez/Library/Android/sdk/platform-tools/adb shell screenrecord --time-limit 180 /sdcard/QA_bug_android.mp4
   ```

   - Si necesitas que esto corra de forma no interactiva, lánzalo con `nohup` y, si procede, redirige salida para que no dependa del TTY:

   ```bash
   nohup /Users/kevinlopez/Library/Android/sdk/platform-tools/adb shell screenrecord --time-limit 180 /sdcard/QA_bug_android.mp4 > /dev/null 2>&1 &
   ```

2. **Ejecutar las interacciones de prueba** (incluyendo abrir la app si aún no está abierta) en el emulador/dispositivo Android mientras `screenrecord` está activo:
   - **Toda interacción** debe ser con MCP (`mobile_mobile_*`), especialmente el lanzamiento de la app (`mobile_mobile_launch_app`).

3. **Copiar el archivo al Escritorio** una vez terminada la grabación, usando `adb pull`:

   ```bash
   /Users/kevinlopez/Library/Android/sdk/platform-tools/adb pull /sdcard/QA_bug_android.mp4 ~/Desktop/QA_bug_android_$(date +%Y%m%d_%H%M%S).mp4
   ```

4. **Verificación antes de reportar:** Igual que en iOS, antes de afirmar que el video existe o dar una ruta concreta, verifica con:

   ```bash
   ls ~/Desktop/QA_bug_android_*.mp4
   ```

   Si no aparece ningún archivo, debes decir que la grabación falló y NO inventar rutas ni tamaños de archivo.

5. **Al reportar un bug en Android con video:** Incluye SIEMPRE:
   - El comando `/Users/kevinlopez/Library/Android/sdk/platform-tools/adb shell screenrecord` que ejecutaste.
   - Si lo usaste con `nohup`, explica cómo lo lanzaste.
   - El comando `/Users/kevinlopez/Library/Android/sdk/platform-tools/adb pull` que utilizaste.
   - El comando `ls` de verificación y su salida.
   - La ruta final del archivo `.mp4` en el Escritorio **solo cuando la verificación lo confirme**.

## Subir videos a BunnyCDN (MCP de uploader)

Tienes disponible un servidor MCP personalizado de **BunnyCDN uploader** (el mismo del repositorio `openclaw_tekaclick`) que expone herramientas de subida, por ejemplo:

- `image-uploader_upload_media` (servidor `image-uploader`, tool `upload_media`)

Siempre que hayas terminado de grabar un video (iOS o Android) y lo hayas verificado en tu Escritorio:

**Regla dura (obligatoria):** Nunca pidas al usuario “Access Key”, “Storage Zone” ni cualquier otra credencial de Bunny. Si el upload falla o la tool no responde, debes devolver SOLO el error exacto de la tool (timeout, conexión, etc.). En ningún caso inventes URLs ni pidas credenciales.

1. **Identifica la ruta absoluta del archivo de video en el Escritorio.**
   - Ejemplo: `/Users/kevinlopez/Desktop/QA_bug_20260317_153812.mp4`

2. **Llama a la tool MCP de BunnyCDN uploader** (no uses `exec` ni Bash) pasando como argumento `file_path` la ruta absoluta del `.mp4`.
   - Debes usarla como Tool nativa (`image-uploader_upload_media` o el nombre equivalente que veas en tu lista de herramientas), nunca como comando de terminal.

3. **Lee la respuesta de la tool:**
   - La tool devuelve un texto con una URL pública HTTPS de Bunny, por ejemplo: `https://openclaw-public.b-cdn.net/123456-abc123.mp4`.

4. **En tus reportes de bug:**
   - Incluye la ruta local del archivo que subiste.
   - Incluye la URL final de BunnyCDN devuelta por la tool.
   - Usa siempre esa URL cuando el usuario te pida “dame el enlace del video” o cuando tengas que pegarlo en GitHub/Canva.

5. **Si la subida falla:**
   - Di explícitamente que el upload a BunnyCDN falló e incluye el mensaje de error de la tool (por ejemplo timeout u otro error MCP).
   - No intentes inventar una URL manualmente.
   - No pidas credenciales al usuario; solo informa el error y sugiere reintentar.
