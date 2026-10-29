import {mkdirSync,copyFileSync,cpSync,writeFileSync} from 'node:fs';
for(const output of ['dist','docs']){
 mkdirSync(output,{recursive:true});
 for(const name of ['index.html','style.css','game.js','physics.js','THIRD_PARTY.md'])copyFileSync(name,`${output}/${name}`);
 cpSync('vendor',`${output}/vendor`,{recursive:true});
 writeFileSync(`${output}/.nojekyll`,'');
}
console.log('Static game prepared in dist/ and docs/ (GitHub Pages).');
