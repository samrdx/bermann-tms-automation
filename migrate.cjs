const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE;
const opencodeJsonPath = path.join(userProfile, '.config', 'opencode', 'opencode.json');
const targetDir = path.join(userProfile, '.gemini', 'config', 'agents');

// Creamos el directorio si no existe                                                                                 
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Leemos y parseamos el JSON de OpenCode                                                                             
const rawData = fs.readFileSync(opencodeJsonPath, 'utf8');
const data = JSON.parse(rawData);
const agents = data.agent || {};

// Función auxiliar recursiva para convertir metadatos a YAML frontmatter                                             
function toYaml(obj, indent = 0) {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'prompt') continue; // El prompt va en el cuerpo del archivo                                      

        const keyStr = key === '*' ? '"*"' : key;
        if (typeof value === 'object' && value !== null) {
            yaml += `${spaces}${keyStr}:\n${toYaml(value, indent + 2)}`;
        } else {
            yaml += `${spaces}${keyStr}: ${JSON.stringify(value)}\n`;
        }
    }
    return yaml;
}

// Iteramos sobre los agentes y creamos los Markdown completos                                                        
for (const [agentName, agentData] of Object.entries(agents)) {
    const prompt = agentData.prompt || '';
    let resolvedPrompt = prompt;

    // Si el prompt es una referencia a un archivo físico, lo cargamos                                                
    if (typeof prompt === 'string' && prompt.startsWith('{file:') && prompt.endsWith('}')) {
        const promptFilePath = prompt.slice(6, -1);
        if (fs.existsSync(promptFilePath)) {
            resolvedPrompt = fs.readFileSync(promptFilePath, 'utf8');
        }
    }

    // Generamos el frontmatter con toda la metadata del JSON (incluye tools y permissions)                           
    const frontmatter = toYaml(agentData).trim();

    const mdContent = `---                                                                                            
    name: ${agentName}                                                                                                    
    ${frontmatter}                                                                                                        
    ---                                                                                                                   
    ${resolvedPrompt}`;

    const targetFile = path.join(targetDir, `${agentName}.md`);
    fs.writeFileSync(targetFile, mdContent, 'utf8');
    console.log(`Actualizado con herramientas: ${agentName}.md`);
}