#!/bin/bash
# Delete lines 342-445 and insert new method
sed -i '342,445d' src/modules/contracts/pages/ContratosPage.ts
# Insert the corrected method at line 342
sed -i '341r .temp-correct-method.ts' src/modules/contracts/pages/ContratosPage.ts
echo "Method replaced successfully"
