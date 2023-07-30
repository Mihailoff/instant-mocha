import path from 'path';
import { createFsFromVolume, Volume } from 'memfs';
import { createFsRequire } from 'fs-require';
import sourceMapSupport from '@cspotcode/source-map-support';
import sourceMappingURL from 'source-map-url';

export const mfs = createFsFromVolume(new Volume());

// @ts-expect-error To support Webpack 4. No longer needed in WP5
mfs.join = path.join;

function removeFsRequirePrefix(filePath: string) {
	const fsRequirePrefix = 'fs-require://1';

	if (filePath.startsWith(fsRequirePrefix)) {
		return filePath.slice(fsRequirePrefix.length);
	}

	return filePath;
}

sourceMapSupport.install({
	environment: 'node',
	retrieveFile(filePath: string) {
		const filteredFilePath = removeFsRequirePrefix(filePath);

		if (mfs.existsSync(filteredFilePath)) {
			return mfs.readFileSync(filteredFilePath).toString();
		}
	},
	retrieveSourceMap(sourceFilePath: string) {
		const filteredSourceFilePath = removeFsRequirePrefix(sourceFilePath);

		if (mfs.existsSync(filteredSourceFilePath)) {
			const sourceFileContent = mfs.readFileSync(filteredSourceFilePath).toString();
			const sourceMapFilePath = sourceMappingURL.getFrom(sourceFileContent);

			if (sourceMapFilePath === null) {
				return null;
			}

			const parentDirectory = path.dirname(filteredSourceFilePath);
			const sourceMapFileFullPath = `${parentDirectory}/${sourceMapFilePath}`;

			if (mfs.existsSync(sourceMapFileFullPath)) {
				return {
					url: sourceFilePath,
					map: mfs.readFileSync(sourceMapFileFullPath).toString(),
				};
			}
		}

		return null;
	},
});

export const mRequire = (modulePath: string): any => (
	createFsRequire(mfs, {
		fs: true,
	})(modulePath)
);
