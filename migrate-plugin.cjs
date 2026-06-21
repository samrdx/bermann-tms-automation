const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE;
const currentDir = process.cwd();
const opencodeJsonPath = path.join(userProfile, '.config', 'opencode', 'opencode.json');
const globalAgentsDir = path.join(userProfile, '.gemini', 'config', 'agents');
const pluginDir = path.join(currentDir, '.agents', 'plugins', 'sdd-plugin');
const pluginAgentsDir = path.join(pluginDir, 'agents');

// Asegurar que existan los directorios
if (!fs.existsSync(pluginAgentsDir)) {
    fs.mkdirSync(pluginAgentsDir, { recursive: true });
}

// Manifiesto del plugin
const pluginJson = {
    name: 'sdd-plugin',
    version: '1.0.0',
    description: 'SDD Orchestrator and subagents plugin'
};
fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2), 'utf8');

// Leer opencode.json
const rawData = fs.readFileSync(opencodeJsonPath, 'utf8');
const data = JSON.parse(rawData);
const agents = data.agent || {};

// Convertir objeto a YAML
function toYaml(obj, indent = 0) {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'prompt') continue;
        if (value === undefined || value === null) continue;
        const keyStr = key === '*' ? '"*"' : key;
        if (typeof value === 'object') {
            yaml += `${spaces}${keyStr}:\n${toYaml(value, indent + 2)}`;
        } else {
            let valStr = String(value);
            if (typeof value === 'string') {
                if (value.startsWith('"') && value.endsWith('"')) {
                    valStr = value;
                } else if (value.includes(':') || value.includes('#') || value.includes('\n')) {
                    valStr = JSON.stringify(value);
                }
            }
            yaml += `${spaces}${keyStr}: ${valStr}\n`;
        }
    }
    return yaml;
}

// Parser simple de frontmatter YAML
function parseSimpleYaml(yamlText) {
    const lines = yamlText.split(/\r?\n/);
    const result = {};
    let currentParent = null;

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const indent = line.length - line.trimStart().length;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;

        const key = trimmed.substring(0, colonIdx).trim();
        let value = trimmed.substring(colonIdx + 1).trim();

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
        } else if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }

        if (indent === 0) {
            if (value === '') {
                result[key] = {};
                currentParent = result[key];
            } else {
                result[key] = value;
                currentParent = null;
            }
        } else if (indent > 0 && currentParent) {
            currentParent[key] = value;
        }
    }
    return result;
}

// Procesar cada agente
for (const [agentName, agentData] of Object.entries(agents)) {
    const prompt = agentData.prompt || '';
    let resolvedPrompt = prompt;

    // Resolver referencias a archivos
    if (typeof prompt === 'string' && prompt.startsWith('{file:') && prompt.endsWith('}')) {
        const promptFilePath = prompt.slice(6, -1);
        if (fs.existsSync(promptFilePath)) {
            resolvedPrompt = fs.readFileSync(promptFilePath, 'utf8');
        }
    }

    // Extraer frontmatter existente del prompt si lo hay
    let body = resolvedPrompt;
    let yamlData = {};
    const trimmedPrompt = resolvedPrompt.trim();
    if (trimmedPrompt.startsWith('---')) {
        const secondFmIndex = trimmedPrompt.indexOf('---', 3);
        if (secondFmIndex !== -1) {
            const fmContent = trimmedPrompt.substring(3, secondFmIndex).trim();
            body = trimmedPrompt.substring(secondFmIndex + 3).trim();
            yamlData = parseSimpleYaml(fmContent);
        }
    }

    // Combinar metadatos
    const finalMetadata = Object.assign(
        { name: agentName },
        yamlData,
        {
            description: agentData.description,
            mode: agentData.mode,
            hidden: agentData.hidden,
            "user-invocable": agentData["user-invocable"],
            model: agentData.model,
            permission: agentData.permission,
            tools: agentData.tools,
            variant: agentData.variant
        }
    );

    const frontmatter = toYaml(finalMetadata).trim();
    const mdContent = `---\n${frontmatter}\n---\n${body}\n`;

    // Todos los agentes se guardan en el plugin local
    const targetFile = path.join(pluginAgentsDir, `${agentName}.md`);
    fs.writeFileSync(targetFile, mdContent, 'utf8');
    console.log(`Creado agente en plugin local: ${targetFile}`);

    // Limpiar el global si existía allí
    if (agentName === 'gentle-orchestrator') {
        const globalDuplicate = path.join(globalAgentsDir, `${agentName}.md`);
        if (fs.existsSync(globalDuplicate)) {
            fs.unlinkSync(globalDuplicate);
            console.log(`Eliminado duplicado global del orquestador: ${globalDuplicate}`);
        }
    }
}