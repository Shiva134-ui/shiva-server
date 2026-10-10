const { runCommand } = require('../utils/command');

async function getFirewallInfo() {
  try {
    const stdout = await runCommand('sudo', ['ufw', 'status', 'verbose']);
    const lines = stdout.split('\n');

    let status = 'unknown';
    let logging = 'unknown';
    let defaultIncoming = 'unknown';
    let defaultOutgoing = 'unknown';
    let defaultRouted = 'unknown';
    const rules = [];

    let inRulesSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('Status:')) {
        status = line.replace('Status:', '').trim();
      } else if (line.startsWith('Logging:')) {
        logging = line.replace('Logging:', '').trim();
      } else if (line.startsWith('Default:')) {
        const parts = line.replace('Default:', '').split(',');
        for (const p of parts) {
          const pt = p.trim().toLowerCase();
          if (pt.includes('incoming')) defaultIncoming = pt;
          if (pt.includes('outgoing')) defaultOutgoing = pt;
          if (pt.includes('routed')) defaultRouted = pt;
        }
      } else if (line.startsWith('To') && line.includes('Action') && line.includes('From')) {
        inRulesSection = true;
        continue;
      } else if (line.startsWith('--') && inRulesSection) {
        continue;
      } else if (inRulesSection) {
        // Parse rule line
        // E.g.: "9443/tcp on tailscale0     ALLOW IN    Anywhere"
        // E.g.: "192.168.1.36 3001/tcp on br-1d4acc4132b7 ALLOW IN    172.21.0.0/16"
        const match = line.match(/^(.+?)\s+(ALLOW IN|DENY IN|REJECT IN|ALLOW OUT|DENY OUT|ALLOW|DENY)\s+(.+)$/i);
        if (match) {
          const toStr = match[1].trim();
          const action = match[2].trim();
          const fromStr = match[3].trim();
          rules.push({
            id: `rule-${rules.length + 1}`,
            to: toStr,
            action,
            from: fromStr,
            raw: line
          });
        } else {
          rules.push({
            id: `rule-${rules.length + 1}`,
            to: line,
            action: 'RULE',
            from: '',
            raw: line
          });
        }
      }
    }

    return {
      status,
      logging,
      defaults: {
        incoming: defaultIncoming,
        outgoing: defaultOutgoing,
        routed: defaultRouted
      },
      rulesCount: rules.length,
      rules,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message,
      rules: [],
      timestamp: new Date().toISOString()
    };
  }
}

async function toggleFirewall(enable) {
  const action = enable ? 'enable' : 'disable';
  await runCommand('sudo', ['ufw', '--force', action]);
  return getFirewallInfo();
}

async function addRule({ port, proto, action, from }) {
  const args = ['ufw'];
  const act = (action && action.toLowerCase() === 'deny') ? 'deny' : 'allow';
  args.push(act);
  
  if (from && from !== 'Anywhere' && from !== 'any') {
    args.push('from', from);
  }
  
  if (port) {
    args.push('to', 'any', 'port', String(port).replace(/[^0-9:\/]/g, ''));
    if (proto && ['tcp', 'udp'].includes(proto.toLowerCase())) {
      args.push('proto', proto.toLowerCase());
    }
  }
  
  await runCommand('sudo', args);
  return getFirewallInfo();
}

async function deleteRule(ruleSpec) {
  // If numeric rule index
  if (/^\d+$/.test(String(ruleSpec).trim())) {
    await runCommand('sudo', ['ufw', '--force', 'delete', String(ruleSpec).trim()]);
  } else {
    // raw rule specification
    await runCommand('sudo', ['ufw', '--force', 'delete', ...ruleSpec.split(' ')]);
  }
  return getFirewallInfo();
}

module.exports = { getFirewallInfo, toggleFirewall, addRule, deleteRule };
