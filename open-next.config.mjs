export default {
  default: {
    override: {
      wrapper: 'cloudflare-node-compat',
      converter: 'edge',
      proxyExternalRequest: true,
    },
  },
  middleware: {
    external: true,
  },
};
