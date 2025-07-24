import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'https://auth.kneo.io',
  realm: 'kneo',
  clientId: 'mixpla',
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`
};

let keycloakInstance = null;

export function getKeycloak() {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }
  return keycloakInstance;
}

export default getKeycloak();
