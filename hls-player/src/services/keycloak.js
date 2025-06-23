import Keycloak from 'keycloak-js';

// TODO: Replace with your actual Client ID
const keycloakConfig = {
  url: 'https://auth.kneo.io',
  realm: 'kneo',
  clientId: 'mixpla'
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
