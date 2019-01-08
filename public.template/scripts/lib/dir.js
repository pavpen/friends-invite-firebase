const fs = require('fs');
const path = require('path');


class DirWalker
{
    constructor(root_path, file_callback, dir_callback, dir_first=true)
    {
        this.root_path = root_path;
        this.file_callback = file_callback;
        this.dir_callback = dir_callback;
        this.dir_first = dir_first;
    }

    walk_dir(start_path, start_rel_path)
    {
        fs.readdirSync(start_path).forEach(
            rel_path =>
            {
                const curr_path = path.join(start_path, rel_path);
                const curr_rel_path = path.join(start_rel_path, rel_path);
 
                if (fs.statSync(curr_path).isDirectory())
                {
                    if (this.dir_first)
                    {
                        if (!this.dir_callback(curr_rel_path, curr_path, this.root_path))
                        {
                            this.walk_dir(curr_path, curr_rel_path);
                        }
                    }
                    else
                    {
                        this.walk_dir(curr_path, curr_rel_path);
                        this.dir_callback(curr_rel_path, curr_path, this.root_path);
                    }
                }
                else
                {
                    this.file_callback(curr_rel_path, curr_path, this.root_path);
                }
            });
    }

    start()
    {
        this.walk_dir(this.root_path, '');
    }
}

class Dir
{
    static walk(
        root_path, file_callback, dir_callback, dir_first=true)
    {
        const walker = new DirWalker(
            root_path, file_callback, dir_callback, dir_first);

        walker.start();
    }

    static rm(start_path, options={recursive: false, ok_not_existent: true})
    {
        try
        {
            if (!options.recursive)
            {
                fs.rmdirSync(start_path);
                return;
            }
            Dir.walk(
                start_path,
                file_path => {
                    fs.unlinkSync(path.join(start_path, file_path));
                },
                dir_path => {
                    fs.rmdirSync(path.join(start_path, dir_path));
                },
                false);
        }
        catch (err)
        {
            if (options.ok_not_existent && err.code === 'ENOENT')
            {
                return;
            }
            throw err;
        }
    }

    static copy(src_path, dest_dir, options={})
    {

        const file_filter = options && options.file_filter || (() => true);
        const dir_filter = options && options.dir_filter || (() => true);
        const mkdir_options = options && options.mkdir_options;

        Dir.walk(
            src_path,
            (file_rel_path, file_path) => {
                if (file_filter(file_rel_path, file_path, src_path))
                {
                    fs.copyFileSync(file_path, path.join(dest_dir, file_rel_path));
                    return false;
                }
                return true;
            },
            (dir_rel_path, dir_path) => {
                if (dir_filter(dir_rel_path, dir_path, src_path))
                {
                    fs.mkdirSync(path.join(dest_dir, dir_rel_path), mkdir_options);
                    return false;
                }
                return true;
            },
            true);
    }
}



module.exports = {
    DirWalker: DirWalker,
    Dir: Dir
};
