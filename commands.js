const commands = {
    help: function(cmd) {
        term.echo(`Available commands: ${Object.keys(commands).join(', ')}`);
    },
    mkdir: function(cmd) {
        term.pause();
        mkdir(cmd.args[0]).then(term.resume);
    },
    rmdir: function(cmd) {
        term.pause();
        rmdir(cmd.args[0]).then(term.resume);
    },
    cd: function(cmd) {
        if (cmd.args.length === 1) {
            var dirname = path.resolve(cwd + '/' + cmd.args[0]);
            term.pause();
            fs.stat(dirname, (err, stat) => {
                if (err) {
                    term.error("Directory don't exits").resume();
                } else if (stat.isFile()) {
                    term.error(`"${dirname}" is not directory`).resume();
                } else {
                    cwd = dirname == '/' ? dirname : dirname.replace(/\/$/, '');
                    term.resume();
                }
            });
        }
    },
    cat: function(cmd) {
        read(cmd, (x) => term.echo(x, {newline: false}));
    },
    less: function(cmd) {
        read(cmd, term.less.bind(term));
    },
    ls: function(cmd) {
        var {options, args} = split_args(cmd.args);
        function filter(list) {
            if (options.match(/a/)) {
                return list;
            } else if (options.match(/A/)) {
                return list.filter(name => !name.match(/^\.{1,2}$/));
            } else {
                return list.filter(name => !name.match(/^\./));
            }
        }
        list(cwd + '/' + (args[0] || '')).then((content) => {
            var dirs = filter(['.', '..'].concat(content.dirs)).map((dir) => color('blue', dir));
            var output = dirs.concat(filter(content.files));
            if (output.length) {
                term.echo(output.join('\n'));
            }
        });
    },
    rm: function(cmd) {
        var {options, args} = split_args(cmd.args);
        
        var len = args.length;
        if (len) {
            term.pause();
        }
        args.forEach(arg => {
            var path_name = path.resolve(cwd + '/' + arg);
            fs.stat(path_name, (err, stat) => {
                if (err) {
                    term.error(err);
                } else if (stat) {
                    if (stat.isDirectory()) {
                        if (options.match(/r/)) {
                            rmDir(path_name);
                        } else {
                            term.error(`${path_name} is directory`);
                        }
                    } else if (stat.isFile()) {
                        fs.unlink(path_name);
                    } else {
                        term.error(`${path_name} is invalid`)
                    }
                    if (!--len) {
                        term.resume();
                    }
                }
            });
        });
    },
    credits: function() {
        this.echo(`
[[!;;;;https://github.com/jcubic/jsvi]JSVI]
Copyright (C) 2006-2008 Internet Connection, Inc.
Copyright (C) 2013-2018 Jakub T. Jankiewicz
[[!;;;;https://terminal.jcubic.pl]jQuery Terminal]
Copyright (C) 2011-2021 Jakub T. Jankiewicz
[[!;;;;https://github.com/timoxley/wcwidth]wcwidth]
Copyright (c) 2012 by Jun Woong
[[!;;;;https://prismjs.com/]PrismJS]
Copyright (c) 2012 Lea Verou
[[!;;;;https://github.com/inexorabletash/polyfill]Keyboard Polyfill]
Copyright (c) 2018 Joshua Bell
[[!;;;;https://github.com/jvilk/BrowserFS]BrowserFS]
Copyright (c) 2013, 2014, 2015, 2016, 2017 John Vilk and other BrowserFS contributors.
`)
    },
    vi: function(cmd) {
        var textarea = $('.vi');
        var editor;
        var fname = cmd.args[0];
        term.focus(false);
        if (fname) {
            var path = resolve(fname);
            function open(file) {
                // we need to replace < and & because jsvi is handling html tags
                // and don't work properly for raw text
                textarea.val(file.replace(/</g, '&lt;').replace(/&/g, '&amp;'));
                editor = window.editor = vi(textarea[0], {
                    color: '#ccc',
                    backgroundColor: '#000',
                    onSave: function() {
                        var file = textarea.val().replace(/&amp;/g, '&').replace(/&lt;/g, '<');
                        fs.writeFile(path, file, function(err, wr) {
                            if (err) {
                                term.error(err.message);
                            }
                        });
                    },
                    onExit: term.focus
                });
            }
            fs.stat(path, (err, stat) => {
                if (stat && stat.isFile()) {
                    read(cmd, open, true);
                } else {
                    var dir = path.replace(/[^\/]+$/, '');
                    fs.stat(dir, (err, stat) => {
                        if (stat && stat.isDirectory()) {
                            open('')
                        } else if (err) {
                            term.error(err.message);
                        } else {
                            term.error(`${dir} directory don't exists`);
                        }
                    });
                }
            });
        }
    }
};

export default commands;