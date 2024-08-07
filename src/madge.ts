import path from 'path';
// import { exec, ExecException } from 'child_process';
import type { ScanConfig } from './configProvider';
import Madge from 'madge';

export type EntryModel = {
    key: string;
    fileIn: string;
    fileOut: string;
}

const createEntryModel = (pathIn: string, sourcePathIn: string[], pathOut: string[]): EntryModel => {
    const parentPathDir = path.resolve(path.join(...sourcePathIn, '..'));
    const keyWithFilename = path.relative(parentPathDir, path.resolve(pathIn));
    const key = path.dirname(keyWithFilename);
    const name = path.basename(pathIn);
    const fullname = `${key}.${name}.dds`;
    const fileOut = path.join(...pathOut, fullname.split(path.sep).join('.'));
    return {
        key,
        fileIn: pathIn,
        fileOut
    } as EntryModel;
};

const madge = (obj: EntryModel, cfg?: ScanConfig): Promise<void> =>
    new Promise<void>(
        (resolve, reject) => {
            Madge(
                obj.fileIn,
                {
                    baseDir: path.join(...cfg.source),
                    fileExtensions: cfg.regex,
                    tsConfig: cfg.tsConfig
                }
            ).then((res) => {
                console.log(`Madge completed with output file: ${obj.fileOut}`);
                console.log(res.obj());
                resolve();
            }).catch((error: Error) => {reject(error)});
        }
    );

export default { madge, createEntryModel };
