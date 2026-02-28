# Specification: Conductor Creation

## Given
- User is logged into the TMS system.
- A Transportista exists and is available in the system.

## When
- User navigates to the Conductor creation page.
- User fills the basic information (Nombre, Apellido, RUT/Documento, Teléfono, Email).
- User selects a "Tipo de Licencia" from the dropdown.
- User selects the previously created "Transportista" from the dropdown.
- User clicks the "Guardar" button.

## Then
- The system should redirect the user to the Conductor list or view page.
- The new Conductor should be correctly linked to the selected Transportista.
- The Conductor details (Nombre, Apellido, RUT, Email) should be saved to the environment-specific data file (`last-run-data-chromium-{env}.json`).

## Environment Specifics
| Field | QA | Demo |
|-------|----|------|
| Transportista | From `last-run-data-*-qa.json` | From `last-run-data-*-demo.json` |
| License | Random | Random |
