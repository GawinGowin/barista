import path from 'path';
import { exec, ExecException } from 'child_process';

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

const madge = (obj: EntryModel): Promise<void> =>
    new Promise<void>(
        (resolve, reject) => {
            exec(
                `madge ${obj.fileIn} > ${obj.fileOut}`,
                { encoding: 'utf-8' },
                (error: ExecException) => {
                    if (error) {
                        reject(error);
                    }
                    console.log(`Madge completed with output file: ${obj.fileOut}`);
                    resolve();
                }
            );
        }
    );

export default { madge, createEntryModel };
