export interface FileCheckOptions {
    /**
     * The base directory to resolve relative paths from
     * @default process.cwd()
     */
    cwd?: string;
    /**
     * Whether to check if the file exists and is readable
     * @default true
     */
    checkReadable?: boolean;
    /**
     * Whether to check if the file exists and is writable
     * @default false
     */
    checkWritable?: boolean;
    /**
     * Whether to check if the file exists and is executable
     * @default false
     */
    checkExecutable?: boolean;
}
/**
 * Check if a file exists and has the specified access rights
 * @param filePath Path to the file to check
 * @param options Check options
 * @returns Promise that resolves to true if the file exists and has the required access, false otherwise
 */
export declare function fileExists(filePath: string, options?: FileCheckOptions): Promise<boolean>;
export declare function fileExistsSync(filePath: string, options?: Omit<FileCheckOptions, 'cwd'> & {
    cwd?: string;
}): boolean;
//# sourceMappingURL=file-utils.d.ts.map