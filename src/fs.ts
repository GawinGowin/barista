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
        const x = line.indexOf('  ') > -1 ? line.replace('  ', '\t') : line; // 中間依存関係のあるファイルなら、タブを追加してマーク
        const isRoot = x.indexOf('\t') === -1; // 中間依存ではない場合 isRoot = true
        const isInternal = x.indexOf('..') === -1; // ../ の位置にあるファイルならば、isInternal = true
        // const sub = isRoot ? `${obj.key}/${x}` : `\t${obj.key}/${x.replace('\t', '')}`;
        const sub = isRoot
            ? path.normalize(`${obj.key}/${x}`)
            : `\t${path.normalize(`${obj.key}/${x.replace('\t', '')}`)}`;
        

        const y = isInternal ? sub : x;
        const z = obj.key === 'src' ? x : y;
        const row = isInternal ? z : z.replace(/(\.\.\/)/g, '');

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

export default { scan, transform };
