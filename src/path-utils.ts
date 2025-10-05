import path from 'path';

export type PathGuardOptions = {
  baseDir: string;
};

export function ensureWithinBase(value: string, { baseDir }: PathGuardOptions): string {
  const resolved = path.resolve(value);
  const normalizedBase = path.resolve(baseDir);
  const relative = path.relative(normalizedBase, resolved);
  if (relative && (relative.startsWith('..') || relative.startsWith(`..${path.sep}`))) {
    throw new Error(`Path ${resolved} is outside of allowed base directory ${normalizedBase}`);
  }
  return resolved;
}
