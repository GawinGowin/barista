import { FileDepOnFile, FolderInFolder, FileFromFolder, EachCmd } from './triples.d';

// (thisFile:File)-[:DEPENDS_ON]->(thatFile:File)
const cmdDependsOn = (x: FileDepOnFile, index: number): string => {
    const thisName = x.thisFile.replace(/\\/g, '/');
    const thatName = x.thatFile.replace(/\\/g, '/');
    return (
        `MERGE (a:File { name: "${thisName}", id: "${thisName}" })
        ON CREATE SET a.contents = $sourceFile
        MERGE (b:File { name: "${thatName}", id: "${thatName}" })
        ON CREATE SET b.contents = $targetFile_${index}
        MERGE (a)-[:DEPENDS_ON]->(b);`
    );
}

// (thisFodler:Folder)-[:IN]->(thatFolder:Folder)
const cmdIn = (x: FolderInFolder): string => {
    const thisName = x.thisFolder.replace(/\\/g, '/');
    const thatName = x.thatFolder.replace(/\\/g, '/');
    return (
        `MERGE (a:Folder { name: "${thisName}", id: "${thisName}" })
        MERGE (b:Folder { name: "${thatName}", id: "${thatName}" })
        MERGE (a)-[:IN]->(b);`
    );
}
// (thisFile:File)-[:FROM]->(thatFolder:Folder)
const cmdFrom = (x: FileFromFolder): string => {
    const thisName = x.thisFile.replace(/\\/g, '/')
    const thatName = x.thatFolder.replace(/\\/g, '/')
    return (`MERGE (a:File { name: "${thisName}", id: "${thisName}"})
    ON CREATE SET a.contents = $sourceFile
    MERGE (b:Folder { name: "${thatName}", id: "${thatName}"})
    MERGE (a)-[:FROM]->(b);`);
}

const mutate = (initFile: string, line: string, index: number): Record<string, string[]> => {
    const result = [];
    let thisFile = initFile;
    const arr = line.split(',');
    if (arr.length === 1) {
        [thisFile] = arr;
        const chunks = thisFile.indexOf('/') > -1 ? thisFile.split('/') : thisFile.split('\\');
        let i = 1;
        let thatFolder = '';
        while (i < chunks.length - 1) {
            const thisFolder = chunks.slice(0, i + 1).join('/');
            thatFolder = chunks.slice(0, i).join('/');
            result.push(cmdIn({ thisFolder, thatFolder }));
            i += 1;
        }
        thatFolder = chunks.slice(0, chunks.length - 1).join('/');
        thatFolder = thatFolder === '' ? 'root' : thatFolder;
        result.push(cmdFrom({ thisFile, thatFolder }));
        return { arr: result, next: [thisFile] };
    }
    const thatFile = arr[1];
    result.push(cmdDependsOn({ thisFile, thatFile }, index));
    return { arr: result, next: [thisFile] };
};

const build = (obj: Record<string, string[]>): EachCmd[] => {
    let thisFile = '';
    
    const result: EachCmd[] = [];
    Object.keys(obj).map((keyObj) => {
        const items = obj[keyObj];
        let index = 0;
        const itemsList = items.map((x) => {
            const result = mutate(thisFile, x, index ++);
            [thisFile] = result.next;
            return result.arr;
        }).reduce((acc, a) => { for (const x of a) { acc.push(x); } return acc; }, []);
        result.push({ cmdString: itemsList, sourceFile: keyObj, targetFile: obj[keyObj] })
    })
    return result
};

export default {
    cmdDependsOn, cmdIn, cmdFrom, build
};
