export type SelectorTier = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary' | 'senary';

export type SelectorStrategy =
    | 'accessibility-id'
    | 'resource-id'
    | 'uiautomator'
    | 'text'
    | 'xpath';

export type SelectorDebtTag =
    | 'none'
    | 'temporary-resource-id'
    | 'temporary-dynamic-resource-id'
    | 'needs-stable-id'
    | 'text-fallback-risk'
    | 'xpath-last-resort'
    | 'temporary-localized-text-fallback'
    | 'temporary-localized-xpath-fallback';

export interface SelectorTierEntry {
    tier: SelectorTier;
    strategy: SelectorStrategy;
    selector: string;
    debtTag: SelectorDebtTag;
}

export interface SelectorEntry {
    key: string;
    owner: string;
    lastValidatedBuild: string;
    primary: SelectorTierEntry;
    fallback: SelectorTierEntry[];
}

const OWNER = 'qa-mobile-auth';
const LAST_VALIDATED_BUILD = 'mobile-auth-poc';

export const loginSelectors = {
    'auth.entry.ingresoButton': {
        key: 'auth.entry.ingresoButton',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        primary: {
            tier: 'primary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().text("INGRESO")',
            debtTag: 'text-fallback-risk'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().textContains("INGRESO")',
            debtTag: 'text-fallback-risk'
        }, {
            tier: 'tertiary',
            strategy: 'xpath',
            selector: '//android.widget.Button[@text="INGRESO"]',
            debtTag: 'xpath-last-resort'
        }, {
            tier: 'quaternary',
            strategy: 'accessibility-id',
            selector: '~auth_ingreso_button',
            debtTag: 'needs-stable-id'
        }, {
            tier: 'quinary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_ingreso_button',
            debtTag: 'temporary-resource-id'
        }]
    },
    'auth.company.input': {
        key: 'auth.company.input',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        // TEMP (device smoke): user-provided selector for current QA app build.
        primary: {
            tier: 'primary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().className("android.widget.EditText")',
            debtTag: 'needs-stable-id'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'xpath',
            selector: '//android.widget.EditText',
            debtTag: 'xpath-last-resort'
        }, {
            tier: 'tertiary',
            strategy: 'accessibility-id',
            selector: '~auth_company_input',
            debtTag: 'needs-stable-id'
        }, {
            tier: 'quaternary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_company_input',
            debtTag: 'temporary-resource-id'
        }, {
            tier: 'quinary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().resourceId("cl.bermann.tms24:id/auth_company_input").className("android.widget.EditText")',
            debtTag: 'needs-stable-id'
        }]
    },
    'auth.company.submitButton': {
        key: 'auth.company.submitButton',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        // TEMP (device smoke): user-provided selector for current QA app build.
        primary: {
            tier: 'primary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().text("IR AL LOGIN")',
            debtTag: 'text-fallback-risk'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().textContains("IR AL LOGIN")',
            debtTag: 'text-fallback-risk'
        }, {
            tier: 'tertiary',
            strategy: 'xpath',
            selector: '//android.widget.Button[@text="IR AL LOGIN"]',
            debtTag: 'xpath-last-resort'
        }, {
            tier: 'quaternary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().textMatches("(?i)^\\s*IR\\s+AL\\s+LOGIN\\s*$")',
            debtTag: 'text-fallback-risk'
        }, {
            tier: 'quinary',
            strategy: 'accessibility-id',
            selector: '~auth_company_submit_button',
            debtTag: 'needs-stable-id'
        }, {
            tier: 'senary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_company_submit_button',
            debtTag: 'temporary-resource-id'
        }]
    },
    'auth.credentials.title': {
        key: 'auth.credentials.title',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        primary: {
            tier: 'primary',
            strategy: 'accessibility-id',
            selector: '~auth_credentials_title',
            debtTag: 'none'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_credentials_title',
            debtTag: 'temporary-resource-id'
        }, {
            tier: 'quaternary',
            strategy: 'text',
            selector: 'android=new UiSelector().text("Iniciar sesion")',
            debtTag: 'text-fallback-risk'
        }]
    },
    'auth.credentials.usernameInput': {
        key: 'auth.credentials.usernameInput',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        // TEMP (device smoke): user-provided selector for current QA app build.
        primary: {
            tier: 'primary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().resourceId("ion-input-4")',
            debtTag: 'temporary-dynamic-resource-id'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().resourceIdMatches("ion-input-(1|4)$")',
            debtTag: 'temporary-dynamic-resource-id'
        }, {
            tier: 'tertiary',
            strategy: 'xpath',
            selector: '//android.widget.EditText[@resource-id="ion-input-1"]',
            debtTag: 'xpath-last-resort'
        }, {
            tier: 'quaternary',
            strategy: 'accessibility-id',
            selector: '~auth_username_input',
            debtTag: 'needs-stable-id'
        }, {
            tier: 'quinary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_username_input',
            debtTag: 'temporary-resource-id'
        }, {
            tier: 'senary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().className("android.widget.EditText").resourceIdMatches("ion-input-[0-9]+$").instance(0)',
            debtTag: 'temporary-dynamic-resource-id'
        }]
    },
    'auth.credentials.passwordInput': {
        key: 'auth.credentials.passwordInput',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        // TEMP (device smoke): user-provided selector for current QA app build.
        primary: {
            tier: 'primary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().resourceId("ion-input-5")',
            debtTag: 'temporary-dynamic-resource-id'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().resourceIdMatches("ion-input-(2|5)$")',
            debtTag: 'temporary-dynamic-resource-id'
        }, {
            tier: 'tertiary',
            strategy: 'xpath',
            selector: '//android.widget.EditText[@resource-id="ion-input-5" or @resource-id="ion-input-2"]',
            debtTag: 'xpath-last-resort'
        }, {
            tier: 'quaternary',
            strategy: 'accessibility-id',
            selector: '~auth_password_input',
            debtTag: 'needs-stable-id'
        }, {
            tier: 'quinary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_password_input',
            debtTag: 'temporary-resource-id'
        }]
    },
    'auth.credentials.loginButton': {
        key: 'auth.credentials.loginButton',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        // TEMP (device smoke): user-provided selector for current QA app build.
        primary: {
            tier: 'primary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().text("LOGIN")',
            debtTag: 'text-fallback-risk'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'xpath',
            selector: '//android.widget.Button[@text="LOGIN"]',
            debtTag: 'xpath-last-resort'
        }, {
            tier: 'tertiary',
            strategy: 'accessibility-id',
            selector: '~auth_login_button',
            debtTag: 'needs-stable-id'
        }, {
            tier: 'quaternary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/auth_login_button',
            debtTag: 'temporary-resource-id'
        }]
    },
    'auth.home.marker': {
        key: 'auth.home.marker',
        owner: OWNER,
        lastValidatedBuild: LAST_VALIDATED_BUILD,
        primary: {
            tier: 'primary',
            strategy: 'accessibility-id',
            selector: '~auth_home_marker',
            debtTag: 'none'
        },
        fallback: [{
            tier: 'secondary',
            strategy: 'resource-id',
            selector: 'id=cl.bermann.tms24:id/home_dashboard_root',
            debtTag: 'temporary-resource-id'
        }, {
            tier: 'tertiary',
            strategy: 'uiautomator',
            selector: 'android=new UiSelector().text("Inicio")',
            debtTag: 'temporary-localized-text-fallback'
        }, {
            tier: 'quaternary',
            strategy: 'xpath',
            selector: '//android.widget.TextView[@text="Inicio"]',
            debtTag: 'temporary-localized-xpath-fallback'
        }]
    }
} as const satisfies Record<string, SelectorEntry>;

export type LoginSelectorKey = keyof typeof loginSelectors;

export const getLoginSelectorEntry = (key: LoginSelectorKey): SelectorEntry => loginSelectors[key];
