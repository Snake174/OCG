# OCG
Old Consoles Games (NodeJS v6.6.0; Electron v1.4.13)

Old consoles games catalogue

![Data master](http://snake174.github.io/programs/consoles-games/img/rc3-0.png)

![Data master](http://snake174.github.io/programs/consoles-games/img/rc3-1.png)

![Data master](http://snake174.github.io/programs/consoles-games/img/rc3-2.png)


## First usage
Create folder "data/emulators" and "data/games"

Run in console
```
npm i -g electron-prebuilt
npm install
```

## Run program
```
npm start
```

## Build for all supported platforms
```
npm i -g electron-packager
npm run build
```

## Adding emulators
Emulators are located in the same folder, respectively, of the platform. 
For WIndows it's "Windows_NT", for Linux - "Linux" ;) 
Add emulators to be put into the appropriate folder (NES, SNES, ...). 
The name of the executable file must be the same as the folder name. For example:
```
Windows_NT/NES/nestopia/nestopia.exe
Windows_NT/Genesis/CoolEmul/CoolEmul.exe
...
```
