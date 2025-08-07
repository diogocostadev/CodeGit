#!/bin/bash

# Script para verificar o SQLite do CodeGit
echo "🔍 Verificando dados do CodeGit..."

# Caminho do banco (multiplataforma)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    DB_PATH="$HOME/Library/Application Support/codegit/database.sqlite"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    DB_PATH="$APPDATA/codegit/database.sqlite"
else
    # Linux
    DB_PATH="$HOME/.local/share/codegit/database.sqlite"
fi

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Banco SQLite não encontrado em: $DB_PATH"
    echo "💡 O banco será criado quando o app for executado"
    exit 1
fi

echo "✅ Banco encontrado: $DB_PATH"
echo "📏 Tamanho: $(ls -lh "$DB_PATH" | awk '{print $5}')"
echo ""

# Verificar tabelas
echo "📊 Tabelas no banco:"
sqlite3 "$DB_PATH" ".tables"
echo ""

# Contar registros
echo "📈 Dados no banco:"
echo "Users: $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM users;')"
echo "Organizations: $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM organizations;')" 
echo "Repositories: $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM repositories;')"
echo "Settings: $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM app_settings;')"
echo ""

# Verificar se tem dados do usuário
USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE name != '' AND email != '';")
if [ "$USER_COUNT" -gt 0 ]; then
    echo "✅ Encontrados dados de usuário no SQLite"
    sqlite3 "$DB_PATH" "SELECT 'Nome: ' || name || ', Email: ' || email || ', Workspace: ' || COALESCE(workspace_name, 'N/A') FROM users;"
else
    echo "⚠️ Nenhum dado de usuário encontrado no SQLite"
fi

# Verificar organizações
ORG_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM organizations;")
if [ "$ORG_COUNT" -gt 0 ]; then
    echo "✅ Encontradas $ORG_COUNT organizações no SQLite"
    sqlite3 "$DB_PATH" "SELECT '• ' || name || ' (' || color || ')' FROM organizations;"
else
    echo "⚠️ Nenhuma organização encontrada no SQLite"
fi

# Verificar status do onboarding
FIRST_TIME=$(sqlite3 "$DB_PATH" "SELECT is_first_time FROM app_settings LIMIT 1;")
if [ "$FIRST_TIME" = "0" ]; then
    echo "✅ Onboarding completado (is_first_time = false)"
else
    echo "⚠️ Onboarding ainda não completado (is_first_time = true)"
fi

echo ""
echo "🗄️ Para inspecionar manualmente:"
echo "sqlite3 '$DB_PATH'"
echo ""
echo "📝 Para verificar localStorage (no DevTools do navegador):"
echo "localStorage.getItem('codegit_app_state')"