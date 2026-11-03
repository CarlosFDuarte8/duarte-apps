# Validação da área pública de vôlei

Execute `npm run test:e2e` (ou `yarn test:e2e`). Antes da primeira execução,
instale o navegador com `npx playwright install chromium`.
Para usar um Chromium já instalado, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

O Playwright inicia um serviço de dados fictícios na porta 3101 e uma instância
separada do Next na porta 3100, com saída em `.next-e2e`. As credenciais de teste
substituem as do `.env`; os testes não acessam nem alteram o banco real.
As duas portas precisam estar livres. O servidor normal da porta 3000 pode continuar aberto.

São verificadas as páginas reais de jogos, detalhes de encontro, cadastro,
ajuda e login, com 320, 390, 768 e 1280 px nos temas claro e escuro.
Os cenários incluem títulos e nomes compridos, vagas reservadas e formulário de
emergência. Os testes verificam vazamento horizontal e fundos claros no modo
escuro, e geram capturas completas em `test-results/` para revisão visual.
Também verificam o tema antes da hidratação, filtros e falhas de cópia de links.
As capturas são artefatos de revisão, não comparações automáticas com imagens de referência.

Os testes unitários (`npm test`) cobrem o cálculo de vagas, a inicialização do
tema e os métodos de cópia, além das regras já existentes.

Para verificar também o CSS otimizado de produção, compile com `VOLLEY_E2E=1`
e execute a suíte com `VOLLEY_E2E_PRODUCTION=1`. Exemplo em PowerShell:

```powershell
$env:VOLLEY_E2E = "1"
$env:NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3101"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key"
$env:SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
npm run build
$env:VOLLEY_E2E_PRODUCTION = "1"
npm run test:e2e
Remove-Item Env:VOLLEY_E2E, Env:VOLLEY_E2E_PRODUCTION
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL, Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Env:SUPABASE_SERVICE_ROLE_KEY
```
