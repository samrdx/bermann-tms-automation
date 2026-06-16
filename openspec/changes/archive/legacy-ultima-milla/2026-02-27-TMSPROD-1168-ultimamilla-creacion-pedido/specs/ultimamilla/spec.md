# Ultima Milla Specification

## Purpose

Este documento especifica el comportamiento esperado para la creación de pedidos en el módulo de Última Milla (`/order/crear`) enfocado en la automatización E2E en QA.

## Requirements

### Requirement: Validación de Fecha de Entrega

El sistema MUST requerir una Fecha de Entrega válida para poder continuar con la creación del pedido.

#### Scenario: Intento de omitir Fecha de Entrega

- GIVEN que el usuario está en el formulario de creación de pedido
- WHEN intenta agregar una parada de entrega sin llenar 'Fecha Entrega'
- THEN el sistema MUST mostrar un mensaje de error indicando 'Debe ingresar la fecha de entrega válida' (o similar según UI).

### Requirement: Dinamismo de Tipo de Embalaje

El sistema MUST mostrar dinámicamente campos dependiendo del "Tipo Embalaje" seleccionado.

#### Scenario: Selección de embalaje tipo Caja

- GIVEN que el usuario está en el formulario de configuración de carga
- WHEN selecciona 'Caja' como 'Tipo Embalaje'
- THEN el sistema MUST desplegar los campos 'Cantidad' y 'Volumen'.

### Requirement: Cálculo de Volumen por Dimensiones

El sistema MUST calcular automáticamente los metros cúbicos (m3) si se especifican las dimensiones.

#### Scenario: Ingreso de dimensiones de la caja

- GIVEN que el usuario ha seleccionado 'Dimensiones' en el dropdown de Volumen
- WHEN ingresa valores numéricos de Ancho, Largo y Alto (máximo 5 dígitos)
- THEN el sistema MUST calcular y mostrar el valor correcto en el campo de m3.

### Requirement: Georreferenciación de Dirección de Entrega

El sistema MUST asociar una dirección de texto a una referencia geográfica real.

#### Scenario: Búsqueda de dirección en Santiago

- GIVEN que el usuario necesita establecer el destino
- WHEN busca una dirección válida en "Santiago de Chile" usando el buscador integrado
- THEN el sistema MUST autocompletar la 'Dirección Seleccionada' con la ubicación normalizada.

### Requirement: Confirmación de Pedido

El sistema MUST notificar al usuario el éxito de la operación.

#### Scenario: Guardado exitoso del pedido

- GIVEN que el usuario completó todos los campos obligatorios del pedido
- WHEN hace clic en el botón de Guardar
- THEN el sistema MUST mostrar un toast con el mensaje 'Pedido Ingresado Correctamente'
- AND la URL MUST mantenerse en `/order/crear` tras la operación.
