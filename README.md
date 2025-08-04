# CodeGit

Uma aplicação desktop Git client moderna construída com Tauri (Rust + React TypeScript), oferecendo uma alternativa ao GitKraken com interface intuitiva e funcionalidades avançadas.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Gerenciamento de Repositórios**: Abrir e navegar em repositórios Git
- **Histórico de Commits**: Visualizar commits com detalhes completos
- **Gerenciamento de Branches**: Criar, alternar, mesclar e excluir branches
- **Operações de Stage/Unstage**: Controle granular de arquivos
- **Remotes**: Adicionar, remover, fetch, pull e push para repositórios remotos
- **Stash**: Criar, aplicar e gerenciar stashes
- **Resolução de Conflitos**: Interface para resolver conflitos de merge
- **Gráfico de Commits**: Visualização gráfica do histórico
- **Diff de Arquivos**: Comparação de alterações em arquivos
- **Interactive Rebase**: Reordenar, squash, edit e reword commits com drag-and-drop
- **Gerenciamento de Submódulos**: Interface para operações com submódulos Git

### 🎯 Recursos Destacados
- **Drag & Drop**: Reordenação intuitiva de commits no rebase interativo
- **Interface Responsiva**: Design moderno e fácil de usar
- **Performance**: Backend em Rust para operações Git rápidas
- **Cross-platform**: Funciona em Windows, macOS e Linux

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Git Operations**: libgit2 (via git2-rs)
- **Styling**: CSS3 com animações e transições

## 📋 Pré-requisitos

- Node.js (v16 ou superior)
- Rust (versão estável)
- Git instalado no sistema

## 🚀 Como Executar

### Instalação
```bash
# Clone o repositório
git clone <repository-url>
cd codegit

# Instale as dependências
npm install
```

### Desenvolvimento
```bash
# Executa em modo desenvolvimento (hot reload)
npm run tauri dev
```

### Build para Produção
```bash
# Gera executável otimizado
npm run tauri build
```

### Comandos Alternativos
```bash
# Executar diretamente com Tauri CLI
npx tauri dev

# Build apenas o frontend
npm run build

# Verificar tipos TypeScript
npm run type-check
```

## 📁 Estrutura do Projeto

```
codegit/
├── src/                    # Frontend React
│   ├── App.tsx            # Componente principal
│   ├── App.css            # Estilos globais
│   └── main.tsx           # Entry point
├── src-tauri/             # Backend Rust
│   ├── src/
│   │   └── main.rs        # Comandos Tauri e lógica Git
│   ├── Cargo.toml         # Dependências Rust
│   └── tauri.conf.json    # Configuração Tauri
├── public/                # Assets estáticos
└── package.json           # Dependências Node.js
```

## 🎮 Como Usar

### 1. Abrir Repositório
- Clique em "Open Repository" na tela inicial
- Selecione uma pasta que contenha um repositório Git

### 2. Navegação por Abas
- **Status**: Visualizar arquivos modificados, stage/unstage
- **Commits**: Histórico de commits com detalhes
- **Branches**: Gerenciar branches locais e remotas
- **Remotes**: Configurar e usar repositórios remotos
- **Stash**: Salvar e aplicar mudanças temporárias
- **Conflicts**: Resolver conflitos de merge
- **Graph**: Visualização gráfica do histórico
- **Diff**: Comparar alterações em arquivos
- **Rebase**: Rebase interativo com drag-and-drop
- **Submodules**: Gerenciar submódulos Git

### 3. Operações Principais

#### Commit
1. Vá para a aba "Status"
2. Selecione arquivos para stage
3. Digite uma mensagem de commit
4. Clique em "Commit"

#### Branch Management
1. Aba "Branches"
2. Criar: Digite nome e clique "Create Branch"
3. Alternar: Clique no nome da branch
4. Merge: Use o botão "Merge" ao lado da branch

#### Interactive Rebase
1. Aba "Rebase"
2. Selecione branch base e commits
3. Arraste commits para reordenar
4. Escolha ações (Pick, Squash, Edit, Reword, Drop)
5. Execute o rebase

## ⚙️ Configuração

### Tauri Configuration
Edite `src-tauri/tauri.conf.json` para:
- Configurar janela da aplicação
- Definir ícones e metadados
- Configurar permissões de sistema

### Environment Variables
Crie `.env` na raiz para configurações personalizadas:
```env
TAURI_ENV=development
```

## 🐛 Troubleshooting

### Erro de Compilação Rust
```bash
# Limpar cache e rebuild
cargo clean
npm run tauri build
```

### Problemas com libgit2
```bash
# Reinstalar dependências Rust
cd src-tauri
cargo update
```

### Interface não carrega
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules
npm install
npm run tauri dev
```

## 🧪 Desenvolvimento

### Estrutura de Comandos Tauri
Todos os comandos Git estão em `src-tauri/src/main.rs`:
- `open_repository`: Abrir repositório
- `get_commits`: Buscar histórico
- `stage_file`/`unstage_file`: Controle de staging
- `create_commit`: Criar commits
- `get_branches`: Listar branches
- E muitos mais...

### Adicionando Novas Funcionalidades
1. Defina comando Rust em `main.rs`
2. Registre no `generate_handler!`
3. Chame do frontend com `invoke()`
4. Atualize interface React

### Debugging
- Backend: Use `println!` ou `dbg!` no Rust
- Frontend: DevTools do navegador (F12)
- Tauri: Console da aplicação

## 📄 Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📧 Suporte

Para bugs e sugestões, abra uma issue no GitHub.

---

**CodeGit** - Uma ferramenta Git moderna e intuitiva 🎯