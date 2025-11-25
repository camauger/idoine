/**
 * Gruntfile.js - IDOINE Static Site Generator
 *
 * This Gruntfile handles frontend asset processing:
 * - Sass compilation (SCSS → CSS)
 * - PostCSS processing (Autoprefixer)
 * - CSS minification (production)
 * - Asset copying (fonts, images)
 * - Development server with live reload
 *
 * Content generation (Markdown → HTML) is handled by Python.
 * See: scripts/core/build.py
 */
module.exports = function (grunt) {
  // Chargement automatique de tous les plugins grunt
  require("load-grunt-tasks")(grunt);

  const sass = require("sass");

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    // Nettoyage des fichiers
    clean: {
      all: ["dist/**/*"],
      styles: ["dist/styles/**/*.{css,css.map}"],
    },

    mkdir: {
      styles: {
        options: {
          create: ["dist/styles"],
        },
      },
    },

    // Compilation Sass
    sass: {
      options: {
        implementation: sass,
      },
      // Configuration pour le développement
      dev: {
        options: {
          sourceMap: true,
          style: "expanded",
        },
        files: {
          "dist/styles/main.css": "src/styles/main.scss",
        },
      },
      // Configuration pour la production
      prod: {
        options: {
          sourceMap: false,
          style: "compressed",
        },
        files: {
          "dist/styles/main.css": "src/styles/main.scss",
        },
      },
    },
    // PostCSS avec Autoprefixer
    postcss: {
      dev: {
        options: {
          map: true,
          processors: [
            require("autoprefixer")(),
          ],
        },
        src: "dist/styles/main.css",
      },
      prod: {
        options: {
          map: false,
          processors: [
            require("autoprefixer")(),
          ],
        },
        src: "dist/styles/main.css",
      },
    },

    // Minification CSS (pour la production)
    cssmin: {
      prod: {
        files: {
          "dist/styles/main.min.css": ["dist/styles/main.css"],
        },
      },
    },

    // Copie des assets (utilise grunt-newer pour ne copier que les fichiers modifiés)
    copy: {
      fonts: {
        expand: true,
        cwd: "src/assets/fonts",
        src: "**/*",
        dest: "dist/assets/fonts/",
      },
      images: {
        expand: true,
        cwd: "src/assets/images",
        src: "**/*",
        dest: "dist/assets/images/",
      },
      scripts: {
        expand: true,
        cwd: "src/scripts",
        src: "**/*.js",
        dest: "dist/scripts/",
      },
    },

    shell: {
      build_html: {
        command: "python scripts/core/build.py --build",
      },
    },

    // Serveur de développement
    connect: {
      server: {
        options: {
          port: 9000,
          hostname: "localhost",
          base: "dist",
          livereload: true,
        },
      },
    },

    // Surveillance des fichiers
    watch: {
      options: {
        livereload: true,
        // Debounce to avoid multiple rebuilds
        debounceDelay: 250,
      },
      styles: {
        files: ["src/styles/**/*.scss"],
        tasks: ["clean:styles", "sass:dev", "postcss:dev"],
      },
      assets: {
        files: ["src/assets/**/*", "!src/assets/fonts/**/*"],
        tasks: ["newer:copy:images"],
      },
      fonts: {
        files: ["src/assets/fonts/**/*"],
        tasks: ["newer:copy:fonts"],
      },
      // Watch Markdown content files
      content: {
        files: [
          "src/locales/**/*.md",
          "src/locales/**/*.yaml",
          "src/locales/**/*.yml",
        ],
        tasks: ["shell:build_html"],
      },
      // Watch Jinja2 templates
      templates: {
        files: [
          "src/templates/**/*.html",
          "src/templates/**/*.jinja2",
        ],
        tasks: ["shell:build_html"],
      },
      // Watch configuration files
      config: {
        files: [
          "src/config/**/*.yaml",
          "src/config/**/*.yml",
          "src/data/**/*.yaml",
          "src/data/**/*.yml",
        ],
        tasks: ["shell:build_html"],
      },
      // Watch JavaScript files
      scripts: {
        files: ["src/scripts/**/*.js"],
        tasks: ["newer:copy:scripts"],
      },
    },
  });

  grunt.registerTask("default", ["dev"]);
  grunt.registerTask("dev", [
    "shell:build_html",
    "sass:dev",
    "postcss:dev",
    "copy",
    "connect",
    "watch",
  ]);
  grunt.registerTask("build", [
    "shell:build_html",
    "clean:styles",
    "mkdir:styles",
    "sass:prod",
    "postcss:prod",
    "cssmin:prod",
    "copy"
  ]);
  grunt.registerTask("both", ["build", "dev"]);
};
