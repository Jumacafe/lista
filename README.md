# Lista de Compras (PWA)

App web instalable de lista de compras. Pensada para celular (iPhone/Safari) y para
publicarse free en GitHub Pages. Sin cuentas, sin servidor: todo se guarda en el
`localStorage` del navegador.

## Archivos

```
index.html              estructura de la app
styles.css              estilos (claro/oscuro, safe-area para iPhone)
app.js                  lógica: agregar, editar, completar, borrar, filtros, persistencia
manifest.webmanifest    manifiesto PWA (nombre, íconos, modo standalone)
sw.js                   service worker: deja la app funcionando sin internet
icons/                  íconos 192 / 512 / maskable / apple-touch-icon
.nojekyll               evita que GitHub Pages procese los archivos con Jekyll
```

## Publicar en GitHub Pages

1. Creá un repo nuevo (por ejemplo `lista-compras`) y subí estos archivos tal cual
   (la carpeta `icons/` completa, no sólo su contenido).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch**, branch `main`
   (o `master`) y carpeta `/ (root)`.
3. Guardá y esperá el deploy. Queda published en
   `https://<tu-usuario>.github.io/lista-compras/`.

## Anclarla en el iPhone (Safari)

1. Abrí la URL de la app en **Safari** (en Chrome no se puede anclar igual).
2. Tocá el botón **Compartir** (cuadrado con flecha) → **Add to Home Screen** / **Añadir a pantalla de inicio**.
3. Elegí el ícono y listo: queda como una app más, abre a pantalla completa y
   funciona incluso sin internet (por el service worker).

En Android/Chrome aparece el prompt de instalación nativo; en escritorio se puede
instalar desde la barra de direcciones.

## Qué hace

- Agregar artículos con cantidad opcional (`2 L`, `12 u`, etc.).
- Editar nombre, cantidad y nota de cualquier artículo.
- Marcar como comprado con el check (el texto queda tachado).
- Borrar con el ícono de papelera, con **Deshacer** durante 9 segundos.
- Filtrar: Todos / Pendientes / Comprados, y borrar los comprados de una vez.
- Reordenar arrastrando por el asa (☰) de cada fila.
- **Compartir** la lista por WhatsApp/email (usa el share sheet nativo de iOS).
- Exportar / importar la lista en JSON, por si querés respaldarla.
- Tema claro/oscuro (por defecto sigue al del sistema).

## Nota

Los datos viven **solo en ese navegador y en ese teléfono**. Si borrás los datos del
sitio o desinstalás la app, se pierde la lista. Para no perderla usá **Exportar** de
vez en cuando.
