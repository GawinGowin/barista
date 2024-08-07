import {
    driver, auth, session, Driver
} from 'neo4j-driver';
import { GraphConfig } from './configProvider';
import { EachCmd } from './triples.d';
import fs from './fs';

interface INeo4jProvider {
    batch(cmds: EachCmd[], sourcePath: string[]): Promise<void>;
    clearDb(): Promise<void>;
    close(): Promise<void>;
}

class Neo4jProvider implements INeo4jProvider {
    private readonly config: GraphConfig;

    private readonly driver: Driver;

    constructor(gcfg: GraphConfig) {
        this.config = gcfg;
        this.driver = driver(
            gcfg.host,
            auth.basic(gcfg.login, gcfg.password),
            { maxTransactionRetryTime: 500000 }
        );
    }

    async batch(cmds: EachCmd[], sourcePath: string[]): Promise<void> {
        const dbSession = this.driver.session({
            database: this.config.database
        });
        const readTxResultPromise = dbSession.executeWrite((txc) => {
            const results = [];
            for (const cmd of cmds) {
                const targets: { [key: string]: string } = {};
                for (let index = 0; index < cmd.targetFile.length; index++) {
                    targets[`targetFile_${index}`] = `${fs.readFileContents(sourcePath, (cmd.targetFile[index]).replace(',', ''))}`;
                }
                for (const cmdstring of cmd.cmdString) {
                    results.push(txc.run(
                        cmdstring, {
                            sourceFile: `${fs.readFileContents(sourcePath, cmd.sourceFile)}`,
                            ...targets
                        }
                    ));
                }
            }
            return results;
        }, {timeout: 300000});
        return readTxResultPromise
            .then()
            .catch((err) => {
                console.error(err);
                throw err;
            })
            .then(() => dbSession.close());
    }

    async clearDb(): Promise<void> {
        const dbSession = this.driver.session({
            database: this.config.database,
            defaultAccessMode: session.WRITE
        });

        return dbSession
            .run('MATCH (n) DETACH DELETE n')
            .catch((err) => {
                console.error(err);
                throw err;
            })
            .then(() => dbSession.close());
    }

    async close(): Promise<void> {
        return this.driver.close();
    }
}

export default { Neo4jProvider };
