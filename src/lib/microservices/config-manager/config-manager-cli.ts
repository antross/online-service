import { ConnectorConfig, HintsConfigObject, HintConfig, UserConfig } from 'hint/dist/src/lib/types';

import { options } from '../../cli/options';
import * as database from '../../common/database/database';
import * as configManager from './config-manager';
import { CLIOptions, IServiceConfig } from '../../types';
import * as logger from '../../utils/logging';

const moduleName: string = 'Configuration Manager';
/**
 * Print the connector options.
 * @param {UserConfig} config Webhint configuration.
 */
const printConnectorOptions = (config: UserConfig) => {
    const connectorOptions = (config.connector as ConnectorConfig).options;

    if (connectorOptions) {
        logger.log('Options: ');
        for (const [key, value] of Object.entries(connectorOptions)) {
            logger.log(`    ${key}: ${value}`);
        }
    }
};

/**
 * Print hints in the configuration.
 * @param {HintsConfigObject | Array<HintConfig>} hints Hints to print.
 */
const printHints = (hints: HintsConfigObject | Array<HintConfig>) => {
    logger.log(JSON.stringify(hints, null, 4));
};

/**
 * Print the configuration options.
 * @param {UserConfig} config Webhint configuration.
 */
const printOptions = (config: UserConfig) => {
    if (config.browserslist) {
        logger.log(`browserslist: ${config.browserslist}`);
    }
    if (typeof config.hintsTimeout !== 'undefined') {
        logger.log(`hintsTimeout: ${config.hintsTimeout}`);
    }
    if (config.ignoredUrls) {
        logger.log(`ignoredUrls:`);
        for (const [key, value] of Object.entries(config.ignoredUrls)) {
            logger.log(`    ${key}: ${value}`);
        }
    }
};

/**
 * Execute the function indicated in the options.
 * @param {CLIOptions} cliOptions Options from the CLI.
 */
export const run = async (cliOptions: CLIOptions) => {
    if (cliOptions.server) {
        return 0;
    }

    await database.connect(process.env.database); // eslint-disable-line no-process-env

    if (cliOptions.file) {
        try {
            const newConfig: IServiceConfig = await configManager.add({
                filePath: cliOptions.file,
                jobCacheTime: cliOptions.cache,
                jobRunTime: cliOptions.run,
                name: cliOptions.name
            });

            logger.log(`Configuration '${newConfig.name}' created.`, moduleName);

            return 0;
        } catch (err) {
            if (err.code === 11000) {
                logger.error(`Already exists a configuration with name '${cliOptions.name}'`, moduleName, err);
            } else {
                logger.error(err.message, moduleName, err);
            }

            return 1;
        }
    }

    if (cliOptions.activate) {
        const config: IServiceConfig = await configManager.activate(cliOptions.name);

        logger.log(`Configuration '${config.name}' activated.`);

        return 0;
    }

    if (cliOptions.list) {
        const configurations: Array<IServiceConfig> = await configManager.list();

        if (configurations.length === 0) {
            logger.log('There is no configuration stored in database');

            return null;
        }

        for (const serviceConfig of configurations) {
            logger.log(`Configuration name: ${serviceConfig.name}${serviceConfig.active ? ' (Active)' : ''}`);
            logger.log(`Cache for jobs: ${serviceConfig.jobCacheTime} seconds`);
            logger.log(`Time to run webhint: ${serviceConfig.jobRunTime} seconds`);
            logger.log('=====================================');
            logger.log('======= Webhint configuration =======');
            logger.log('=====================================');
            const configs = serviceConfig.webhintConfigs;

            for (const config of configs) {
                logger.log('============ Connector ============');
                logger.log(`Name: ${typeof config.connector === 'string' ? config.connector : config.connector.name}`);
                printConnectorOptions(config);
                logger.log('============== Hints ==============');
                printHints(config.hints);
                logger.log('============= Options =============');
                printOptions(config);
                logger.log('');
                logger.log('');
            }
        }

        return null;
    }

    logger.log('Configuration manager options:\n');
    logger.log(`${options.generateHelpForOption('list')}\n`);
    logger.log(`${options.generateHelpForOption('file')}\n`);
    logger.log(`${options.generateHelpForOption('activate')}\n`);

    return 0;
};
