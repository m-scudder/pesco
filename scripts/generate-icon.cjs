/* Generates Expo launcher art from the editable SVG source. */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
async function main(){
 const source=path.join(__dirname,'../assets/pesco-icon.svg');
 const target=path.join(__dirname,'../assets/icon.png');
 await sharp(fs.readFileSync(source)).resize(1024,1024).png().toFile(target);
 console.log('Generated assets/icon.png');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
