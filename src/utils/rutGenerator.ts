/**
 * Chilean RUT Generator and Utilities
 *
 * Generates valid Chilean RUTs with proper verification digit calculation
 * and provides helper functions for test data generation.
 */

/**
 * Generates a valid Chilean RUT with verification digit
 * Format: 12345678-9
 *
 * Algorithm:
 * 1. Generate random 7-8 digit number
 * 2. Calculate verification digit using modulo 11
 * 3. Format as NNNNNNNN-V
 */
export function generateValidChileanRUT(): string {
  // Generate random 8-digit number (10000000 - 99999999)
  const number = Math.floor(Math.random() * 90000000) + 10000000;

  // Calculate verification digit
  let sum = 0;
  let multiplier = 2;

  const numberStr = number.toString();
  for (let i = numberStr.length - 1; i >= 0; i--) {
    sum += parseInt(numberStr[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const verifier = 11 - remainder;

  let dv: string;
  if (verifier === 11) {
    dv = '0';
  } else if (verifier === 10) {
    dv = 'K';
  } else {
    dv = verifier.toString();
  }

  return `${number}-${dv}`;
}

/**
 * Generates a random Chilean first name
 */
export function generateRandomName(): string {
  const nombres = [
    'Juan',
    'Pedro',
    'María',
    'Ana',
    'Carlos',
    'Luis',
    'Carmen',
    'José',
    'Francisco',
    'Antonio',
    'Rosa',
    'Elena',
    'Diego',
    'Sofía',
    'Valentina'
  ];
  return nombres[Math.floor(Math.random() * nombres.length)];
}

/**
 * Generates a random Chilean last name
 */
export function generateRandomLastName(): string {
  const apellidos = [
    'González',
    'Rodríguez',
    'García',
    'Martínez',
    'López',
    'Silva',
    'Muñoz',
    'Fernández',
    'Pérez',
    'Soto',
    'Contreras',
    'Torres',
    'Araya',
    'Rojas',
    'Díaz'
  ];
  return apellidos[Math.floor(Math.random() * apellidos.length)];
}

/**
 * Generates a Chilean vehicle license plate
 * Format: ABCD-12 (4 uppercase letters + dash + 2 digits)
 */
export function generatePatente(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let patente = '';

  // Generate 4 random uppercase letters
  for (let i = 0; i < 4; i++) {
    patente += letters[Math.floor(Math.random() * letters.length)];
  }

  // Add dash
  patente += '-';

  // Add 2 random digits (10-99)
  const digits = Math.floor(Math.random() * 90) + 10;
  patente += digits.toString();

  return patente;
}

/**
 * Generates a username (max 15 characters)
 * Format: user12345
 */
export function generateUsername(): string {
  const randomNumber = Math.floor(Math.random() * 100000);
  const username = `user${randomNumber}`;
  return username.slice(0, 15); // Max 15 characters
}

/**
 * Generates a password (max 10 characters)
 * Format: pass1234
 */
export function generatePassword(): string {
  const randomNumber = Math.floor(Math.random() * 10000);
  const password = `pass${randomNumber}`;
  return password.slice(0, 10); // Max 10 characters
}

/**
 * Generates a Chilean phone number
 * Format: +569XXXXXXXX (+569 followed by 8 digits)
 */
export function generatePhone(): string {
  const randomDigits = Math.floor(Math.random() * 90000000) + 10000000;
  return `+569${randomDigits}`;
}

/**
 * Generates an email address
 * Format: name@test.com
 */
export function generateEmail(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '')}@test.com`;
}

/**
 * Generates a unique ID based on timestamp
 * Returns last 8 digits
 */
export function generateUniqueId(): string {
  return Date.now().toString().slice(-8);
}

/**
 * Generates a 4-digit random number for street numbers
 */
export function generateStreetNumber(): string {
  return Math.floor(Math.random() * 9000 + 1000).toString();
}

/**
 * Generates a random company name
 */
export function generateCompanyName(): string {
  const types = ['Transportes', 'Logística', 'Cargo', 'Express', 'Distribución'];
  const names = ['Sur', 'Norte', 'Central', 'Rápido', 'Global', 'Nacional'];

  const type = types[Math.floor(Math.random() * types.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const id = generateUniqueId();

  return `${type} ${name} ${id}`;
}

/**
 * Generates a unique transportista company name with shortened Unix timestamp
 * Format: "[Company Name] - [6-digit timestamp]"
 * Example: "TransSur Logística - 792595"
 *
 * NOTE: Uses last 6 digits of Unix epoch seconds (modulo 1000000) for shorter names
 * while maintaining uniqueness during test execution. The delimiter ' - ' is preserved
 * for backward compatibility with split() operations.
 */
export function generateShortCompanyName(): string {
  const companies = [
    'TransSur Logística',
    'Cordillera Express',
    'Pacific Cargo SpA',
    'Rutas del Maule',
    'LogiChile Connect',
    'Andes Transport Services',
    'Austral Freight',
    'Vía Rápida SpA',
    'MegaLogística Central',
    'Transportes Atacama',
    'EcoTrans Innovación',
    'Global Shipping Chile',
    'Fletes El Roble',
    'Horizonte Logístico',
    'Delta Transportes',
    'Prime Cargo Solutions',
    'Logística 360 SpA',
    'Ruta Nacional Express',
    'InterModal Sur',
    'Titanium Logistics'
  ];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const unixSeconds = Math.floor(Date.now() / 1000) % 1000000; // Last 6 digits for shorter names
  return `${company} - ${unixSeconds}`;
}

/**
 * Generates a random Chilean street name
 */
export function generateChileanStreet(): string {
  const streets = [
    'Av. Libertador Bernardo O\'Higgins',
    'Av. Providencia',
    'Av. Apoquindo',
    'Av. Las Condes',
    'Av. Kennedy',
    'Calle Estado',
    'Calle Huérfanos',
    'Calle Ahumada',
    'Av. Vicuña Mackenna',
    'Av. Matta',
    'Gran Avenida',
    'Av. Pajaritos',
    'Camino a Melipilla'
  ];
  return streets[Math.floor(Math.random() * streets.length)];
}

/**
 * Generates a random apartment number
 */
export function generateApartmentNumber(): string {
  return Math.floor(Math.random() * 900 + 100).toString();
}

/**
 * Generates a generic username with prefix + random numbers
 * Format: prefix + 2 digits (e.g., manuh12)
 */
export function generateGenericUser(prefixLength: number = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let prefix = '';
    for (let i = 0; i < prefixLength; i++) {
        prefix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const digits = Math.floor(Math.random() * 90 + 10); // 10-99
    return `${prefix}${digits}`;
}

/**
 * Generates a random Chilean driver's license type
 */
export function generateLicenseType(): string {
    const types = ['A1', 'A2', 'A3', 'A4', 'A5'];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Generates a document number based on type
 */
export function generateDocument(type: 'RUT' | 'EXTRANJERO'): string {
    if (type === 'RUT') {
        const rawRut = generateValidChileanRUT();
        return rawRut.replace(/^(\d{1,2})(\d{3})(\d{3})(-[\dkK])$/, '$1.$2.$3$4');
    } else {
        // Extranjero: 90M+ range usually
        const num = Math.floor(Math.random() * 5000000) + 90000000;
        return num.toString();
    }
}

/**
 * Generates a random contract number (6 digits)
 */
export function generateContractNumber(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
}

/**
 * Generates a random hourly rate (100 - 20000)
 */
export function generateValorHora(): string {
    return Math.floor(Math.random() * (20000 - 100 + 1) + 100).toString();
}
