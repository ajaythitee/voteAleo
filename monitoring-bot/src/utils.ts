import { spawn } from 'node:child_process';

export function parseFieldNumber(source: string, key: string): number {
  const match = source.match(new RegExp(`${key}\\s*:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : 0;
}

export function parseNumberish(raw: string): number {
  const match = raw.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

export async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function tryGetLatestBlockHeight(base: string, network: string): Promise<number> {
  const candidates = [
    `${base}/${network}/block/height/latest`,
    `${base}/${network}/block/latest/height`,
    `${base}/${network}/latest/height`,
  ];

  for (const url of candidates) {
    const raw = await fetchText(url);
    if (!raw) continue;
    const h = parseNumberish(raw);
    if (h > 0) return h;
    try {
      const json = JSON.parse(raw) as unknown;
      if (!json || typeof json !== 'object') continue;
      const record = json as Record<string, unknown>;
      const jsonHeight = parseNumberish(String(record.height ?? record.block_height ?? record.latest_height ?? ''));
      if (jsonHeight > 0) return jsonHeight;
    } catch {
      // ignore
    }
  }
  return 0;
}

export async function leoExecute(args: string[], opts: { cwd: string; timeoutMs?: number }): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = spawn('leo', args, { cwd: opts.cwd, windowsHide: true });
    let out = '';
    let err = '';
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ code: 124, out, err: `${err}\n[timeout]` });
    }, opts.timeoutMs ?? 180_000);

    child.stdout.on('data', (d) => (out += String(d)));
    child.stderr.on('data', (d) => (err += String(d)));
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? 1, out, err });
    });
  });
}

