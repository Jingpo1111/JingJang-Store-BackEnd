npm init -y
npm i express --save



//Auto save for Nodemon
npm install --save-dev nodemon 

//on file package.json please change to 
main: "sever.js"
"scripts": {
    "dev": "nodemon sever.js"
}

Run: npm run dev


to make it 

