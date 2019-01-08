const child_process = require('child_process');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');
const dir = require('./lib/dir');


// mkdir build && firebase functions:config:get > build/functions-config.json && nunjucks --path src --out build/public build/functions-config.json

const config = {
    src_dir: 'src',
    dest_dir: 'build/public',
    published_modules:
    {
        src_dir: 'bower_components',
        dest_dir: 'build/public/bower_components',
        exclude_paths: 
            [
                // Paths under a module that start with a dot:
                /^[^/\\]+[/\\][.]./,
                // Paths named 'test' under a module:
                /^[^/\\]+[/\\]test$/,
                // Paths named 'tests' under a module:
                /^[^/\\]+[/\\]tests$/,
                // Paths named 'demo' under a module:
                /^[^/\\]+[/\\]demo$/,
            ],
        exclude_files:
            [
                // Files ending in '.md' under a module:
                /^[^/\\]+[/\\][^/\\]+[.]md$/,
                // Files ending in '.sh' under a module:
                /^[^/\\]+[/\\][^/\\]+[.]sh$/,
                // Files ending in '.json' under a module:
                /^[^/\\]+[/\\][^/\\]+[.]json$/,
            ],
        exclude_dirs: 
            [
            ],
    }
};



class TemplateDirExpander
{
    constructor(src_dir, dest_dir)
    {
        this.src_dir = src_dir;
        this.dest_dir = dest_dir;
        this.suffix_filters = {
            'njk': this.expand_nunjucks
        };
    }

    start()
    {
        this.configure_template_engines();
        this.acquire_template_vars();
        this.clean_dest();
        this.expand_src_tree();
    }

    configure_template_engines()
    {
        this.nunjucks_env = new nunjucks.Environment(
            new nunjucks.FileSystemLoader(''),
            {
                throwOnUndefined: true
            }
        );
    }

    acquire_template_vars()
    {
        const vars_json = child_process.execSync('firebase functions:config:get');

        this.template_vars = JSON.parse(vars_json);
    }

    clean_dest()
    {
        // Clean the destination:
        dir.Dir.rm(this.dest_dir, {recursive: true});
        fs.mkdirSync(this.dest_dir, { 'recursive': true });
    }

    expand_src_tree()
    {
        // Copy the directory tree, expanding templates:
        const self = this;

        dir.Dir.walk(
            this.src_dir,
            curr_path =>
            {
                const suffix_idx = curr_path.lastIndexOf('.');
                const suffix = curr_path.substr(suffix_idx + 1);
                const src_path = path.join(this.src_dir, curr_path);

                if (this.suffix_filters.hasOwnProperty(suffix))
                {
                    const dest_path = path.join(this.dest_dir, curr_path.substr(0, suffix_idx));

                    this.suffix_filters[suffix].call(self, src_path, dest_path);
                }
                else
                {
                    const dest_path = path.join(this.dest_dir, curr_path);

                    fs.copyFileSync(src_path, dest_path);
                }
            },
            curr_path =>
            {
                fs.mkdirSync(path.join(this.dest_dir, curr_path));
            });
    }

    expand_nunjucks(src_path, dest_path)
    {
        const expansion = this.nunjucks_env.render(src_path, this.template_vars);

        fs.writeFileSync(dest_path, expansion);
    }
}

function matchesOne(str_value, patterns)
{
    for (var i = 0; i < patterns.length; ++i)
    {
        // console.log(`${patterns[i]} ~= ${str_value}: ${patterns[i].test(str_value)}`);
        if (patterns[i].test(str_value))
        {
            return true;
        }
    }

    return false;
}

new TemplateDirExpander(config.src_dir, config.dest_dir).start();
dir.Dir.copy(
    config.published_modules.src_dir,
    config.published_modules.dest_dir, 
    {
        file_filter: file_rel_path => {
            return (!matchesOne(file_rel_path, config.published_modules.exclude_paths)) &&
                (!matchesOne(file_rel_path, config.published_modules.exclude_files));
        },
        dir_filter: dir_rel_path => {
            return (!matchesOne(dir_rel_path, config.published_modules.exclude_paths)) &&
                (!matchesOne(dir_rel_path, config.published_modules.exclude_dirs));
        },
        mkdir_options: { recursive: true }
    });
