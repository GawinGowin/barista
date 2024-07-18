import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { EntryModel } from './madge';

const scan = (dir: string[], regex: string): Promise<string[]> => new Promise((resolve, reject) => {
    const pattern = path.join(...[...dir, regex]);
    glob(pattern, {}, (err, files) => {
        if (err) {
            reject(err);
        }
        resolve(files);
    });
});

const mergeFromFile = (result: Record<string, string[]>, obj: EntryModel): void => {
    const lines = fs.readFileSync(obj.fileOut, 'utf-8').split(/\r?\n/)
    let root = '';
    let isPush = false;
    for (const line of lines) {
        if (line.trim() === '' || line.indexOf('Processed') > -1) continue;
        const dependentFile = line.indexOf('  ') > -1 ? line.replace('  ', ',') : line;
        const isRoot = dependentFile.indexOf(',') === -1;
        const row = isRoot
            ? path.normalize(`${obj.key}/${dependentFile}`)
            : `,${path.normalize(`${obj.key}/${dependentFile.replace(',', '')}`)}`;
        if (isRoot) {
            isPush = false;
        }
        if (isRoot && result[row] === undefined) {
            isPush = true;
            root = row;
            // eslint-disable-next-line no-param-reassign
            result[root] = [root];
        } else if (isPush) {
            result[root].push(row);
        }
    }
};

const transform = (objs: EntryModel[]): Record<string, string[]> => {
    const result = {} as Record<string, string[]>;
    objs.forEach((obj) => {
        mergeFromFile(result, obj);
    });
    return { ...result };
};

const readFileContents = (sourcePath: string[], fileKey: string): string => {
    const file = path.join(...sourcePath, '../', fileKey);
    const lines = fs.readFileSync(file, 'utf-8');
    return lines;
}

export default { scan, transform, readFileContents };
