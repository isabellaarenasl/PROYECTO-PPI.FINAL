# Conéctate Candelaria

Conéctate Candelaria es una aplicación web para facilitar la comunicación entre estudiantes, docentes y personal autorizado de la comunidad educativa. Permite compartir publicaciones, reaccionar a contenidos, intercambiar mensajes y recibir notificaciones desde una plataforma centralizada.

## Tecnologías usadas

- React 19
- Vite
- React Router
- Supabase (autenticación, base de datos, Storage y actualizaciones en tiempo real)
- Bootstrap 5
- JavaScript (ES modules)

## Requisitos previos

- Node.js 20 o una versión compatible con Vite.
- npm.
- Un proyecto de Supabase configurado con las tablas, políticas RLS, buckets y proveedores de autenticación que utiliza la aplicación.

## Instalación y ejecución

Clona el repositorio e instala sus dependencias:

```bash
git clone https://github.com/isabellaarenasl/PROYECTO-PPI.FINAL.git
cd PROYECTO-PPI.FINAL
npm install
```

Crea las variables de entorno indicadas en la siguiente sección y ejecuta el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en la URL que muestre Vite, normalmente `http://localhost:5173`.

Para generar una versión de producción y previsualizarla:

```bash
npm run build
npm run preview
```

También puedes revisar el código con:

```bash
npm run lint
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto. No publiques este archivo ni sustituyas estos valores por claves reales en el README:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_publica_de_supabase
```

En el panel de Supabase debes habilitar los métodos de autenticación que se vayan a utilizar, incluido Google si se desea ofrecer ese acceso. La URL de redirección debe apuntar a `/verificar-estudiante` para el flujo de estudiantes.

La aplicación utiliza datos de perfiles, estudiantes, publicaciones, reacciones, mensajes, conversaciones de chat y notificaciones. También utiliza los buckets públicos `publicaciones` y `avatars` para imágenes. Las tablas y los buckets deben tener políticas RLS y de Storage que permitan únicamente las operaciones autorizadas para cada usuario.

## Estructura del proyecto

```text
src/
├── assets/                  Recursos estáticos de la aplicación
├── components/              Componentes reutilizables y formularios de acceso
├── lib/supabaseClient.js    Cliente y configuración de autenticación de Supabase
├── pages/                   Vistas principales de estudiantes y personal autorizado
├── App.jsx                  Rutas y control global de sesión
├── App.css                  Estilos de los componentes y vistas
└── index.css                Estilos globales
public/                      Imágenes y recursos públicos
```

## Funcionalidades

- [x] Acceso diferenciado para estudiantes y docentes o personal autorizado.
- [x] Registro e inicio de sesión de estudiantes con correo y contraseña.
- [x] Inicio de sesión de estudiantes mediante Google.
- [x] Verificación y configuración inicial del perfil del estudiante.
- [x] Inicio con publicaciones de la comunidad y filtros por búsqueda, mes y año.
- [x] Reacciones a publicaciones.
- [x] Creación, edición y eliminación de publicaciones para usuarios autorizados.
- [x] Carga de imágenes JPG, PNG y WebP de hasta 5 MB.
- [x] Mensajería entre estudiantes y personal autorizado.
- [x] Actualizaciones de conversaciones en tiempo real mediante Supabase.
- [x] Notificaciones con estado de lectura y enlaces internos.
- [x] Edición del perfil y foto de usuario.
- [x] Validación de mensajes con contenido delicado y registro de auditoría.

## Rutas principales

- `/` - Página de bienvenida y selección de rol.
- `/estudiantes` - Acceso y vista principal de estudiantes.
- `/verificar-estudiante` - Verificación del perfil después del acceso.
- `/completar-perfil-estudiante` - Configuración inicial del perfil de estudiante.
- `/acceso-profesores` - Acceso de docentes y personal autorizado.
- `/acceso-profesores/publicaciones` - Gestión de publicaciones propias.
- `/acceso-profesores/mensajes` - Gestión de conversaciones.
- `/acceso-profesores/perfil` - Edición del perfil y avatar.
- `/acceso-profesores/notificaciones` - Consulta de notificaciones.

## Autores

Equipo de desarrollo del Proyecto PPI - Conéctate Candelaria.

> Completa esta sección con los nombres y usuarios de GitHub de todos los integrantes antes de entregar el proyecto.

## Licencia

Este proyecto no tiene una licencia de software definida actualmente.
