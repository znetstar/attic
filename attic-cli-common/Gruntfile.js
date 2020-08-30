module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ts: {
            common : {
                outDir: "./lib",
                tsconfig: './tsconfig.json'
            },
            options: {
                "rootDir": "./src"
            }
        }
    });

    grunt.loadNpmTasks('grunt-ts');
    grunt.registerTask('default', [  'ts:common' ]);
};