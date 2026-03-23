import { isDemoMode } from '../../src/utils/env-helper.js';

type ClientCandidate = {
    nombreFantasia?: unknown;
    nombre?: unknown;
};

type OperationalData = {
    seededCliente?: ClientCandidate;
    cliente?: ClientCandidate;
};

export class ClientResolver {
    private static normalizeCandidate(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }

        const normalizedValue = value.trim();
        return normalizedValue || null;
    }

    private static pushUniqueCandidate(candidates: string[], seen: Set<string>, value: unknown): void {
        const normalizedValue = this.normalizeCandidate(value);
        if (!normalizedValue) {
            return;
        }

        const dedupeKey = normalizedValue.toLocaleLowerCase();
        if (seen.has(dedupeKey)) {
            return;
        }

        seen.add(dedupeKey);
        candidates.push(normalizedValue);
    }

    private static appendDropdownCandidates(candidates: string[], seen: Set<string>, cliente?: ClientCandidate): void {
        if (!cliente) {
            return;
        }

        this.pushUniqueCandidate(candidates, seen, cliente.nombre);
        this.pushUniqueCandidate(candidates, seen, cliente.nombreFantasia);
    }

    private static getFallbackPrefix(): string {
        const env = (process.env.ENV || '').trim().toUpperCase();
        return isDemoMode() || env === 'DEMO' ? 'Demo_' : 'Qa_';
    }

    private static getValidName(cliente?: ClientCandidate): string | null {
        if (!cliente) {
            return null;
        }

        const nombreFantasia = typeof cliente.nombreFantasia === 'string'
            ? cliente.nombreFantasia.trim()
            : '';
        if (nombreFantasia) {
            return nombreFantasia;
        }

        const nombre = typeof cliente.nombre === 'string'
            ? cliente.nombre.trim()
            : '';
        return nombre || null;
    }

    static getDropdownCandidates(operationalData?: unknown): string[] {
        const data = (operationalData && typeof operationalData === 'object'
            ? operationalData
            : undefined) as OperationalData | undefined;

        const candidates: string[] = [];
        const seen = new Set<string>();

        this.appendDropdownCandidates(candidates, seen, data?.seededCliente);
        this.appendDropdownCandidates(candidates, seen, data?.cliente);

        return candidates;
    }

    static resolveClientName(operationalData?: unknown): string {
        const data = (operationalData && typeof operationalData === 'object'
            ? operationalData
            : undefined) as OperationalData | undefined;

        const seededClientName = this.getValidName(data?.seededCliente);
        if (seededClientName) {
            return seededClientName;
        }

        const legacyClientName = this.getValidName(data?.cliente);
        if (legacyClientName) {
            return legacyClientName;
        }

        return this.getFallbackPrefix();
    }
}
