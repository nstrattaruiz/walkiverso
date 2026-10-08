// Los datos de la tienda. En la plataforma salen del SDK (`/api/v1/sdk.js`): productos, carrito, checkout, menús…
// Fuera de la plataforma (abriendo la carpeta con `node .dev/servir.mjs`) se usa una tienda de demostración
// con la misma forma, para poder ver y probar la web sin conectar nada.
let tienda;
let esDemo = false;
try {
  ({ tienda } = await import('/api/v1/sdk.js'));
  if (!tienda) throw new Error('sin SDK');
} catch {
  ({ tienda } = await import('./demo.js'));
  esDemo = true;
}
export { tienda, esDemo };
