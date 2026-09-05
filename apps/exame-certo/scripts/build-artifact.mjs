/**
 * Empacota o app em um unico HTML, para publicar como Artifact.
 *
 * O wrapper do Artifact ja fornece doctype, html, head e body, entao o arquivo
 * gerado carrega so o conteudo: title, fonte, estilo, raiz e script inline.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SAIDA = 'dist/exame-certo.artifact.html';

const assets = readdirSync(join(DIST, 'assets'));
const arquivoCss = assets.find((f) => f.endsWith('.css'));
const arquivoJs = assets.find((f) => f.endsWith('.js'));

if (!arquivoCss || !arquivoJs) {
  throw new Error('Rode `npm run build` antes: não encontrei os assets em dist/assets.');
}

const css = readFileSync(join(DIST, 'assets', arquivoCss), 'utf8');
const js = readFileSync(join(DIST, 'assets', arquivoJs), 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/m, '')
  .trim();

// `</script>` dentro de string quebraria o script inline.
const jsSeguro = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>ExameCerto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Public+Sans:wght@400;600&display=swap">
<style>
${css}
</style>
<div id="app"></div>
<script type="module">
${jsSeguro}
</script>
`;

writeFileSync(SAIDA, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`[artifact] ${SAIDA} — ${kb} kB`);
