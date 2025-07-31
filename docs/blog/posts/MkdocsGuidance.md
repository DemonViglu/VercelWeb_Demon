---
date: 2025-07-24
categories: 
    - Tech
---
# Mkdocs Building Guidance
<!-- more -->
## First Step : Download
### Download python and pip
- If you have python and pip, jump to download the mkdocs.
- Click the [Python download website](https://www.python.org/downloads/) to download the python. You can just choose the version lastest.
- If you are rich in c disk, just install it. All will be right and pip will be install too.
!!! note
    If you already have python but no pip, search for the guidance online yourself please.
### Download mkdocs
- Use the code in terminal.
        pip install mkdocs
### Download Material for mkdocs
- If you just want a website build by mkdocs, this is not necessary. But this guidance is for making a website as the same of mine.
- Use the code in terminal.
        pip install mkdocs-material
## Second Step : Create a project 
- you need a browser like this
```
    - docs
        - assets
        - blog
        - index.md
    - mkdocs.yml
    - requirements.txt
```
- Then copy the content from my reprocity.
### Download some plugin for material
- Use the code in terminal.
        pip install -r requirements.txt
- When doing the last step, make sure your terminal path is locating in the folder path.
- After this, all the requirements will be installed soon.
### Set some of configs
- If you don't want a git, or you just need a web note local, comment the config having "git" in mkdocs.yml just ok.
## Usage
- Use the code in terminal.
        mkdocs build
    then you will see there is a new folder named site.
- open the index.html, it's the main site you need.
### Make Blog searchable
- Make the file "docs/blog/index.md" like this
        ---
        search:
        exclude: true
        ---
        # Blog
### Writing a blog 
- There is a must in the front of your blog file.
        ---
        date: YYYY-MM-DD
        categories: 
            - YOU_CATEGORY
        ---
        # You Title
        <!-- more -->
## Optional
- As you can see, there are some art assets needed like font or some others. If you need it, download them and copy into the project you self in my github.

- If you want build it in another environment;

        When install
        ```
                python -m venv env
                ./env/scripts/activate
                pip install --upgrade pip
                pip install -r requirements
        ```

        When bulid
        ```
                ./env/scripts/activate
                mkdocs bulid
        ```
## Problem
- This may occur when you mkdocs is not the correct version.
        WARNING -  Config value 'validation': Sub-option 'links': Sub-option 'anchors': Unrecognised configuration name: anchors
## The last
- Relax youself !! HAVING A GOOD DAY !!