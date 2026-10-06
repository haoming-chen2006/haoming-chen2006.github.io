# 王者荣耀 official asset pack (sponsor-provided)

Drop files here; the game probes each path once and uses it in place of the built-in stand-in.

```
heroes/<heroId>/portrait.png      square portrait (cards, HUD)
heroes/<heroId>/splash.jpg        16:9 splash behind the hero detail panel
heroes/<heroId>/model.glb         hero model, Y-up, faces +Z, any height (auto-scaled to 1.8 units)
heroes/<heroId>/voice/pick.ogg    pick line   (also kill.ogg, death.ogg, ult.ogg)
announcer/{first_blood,double,triple,quadra,penta,ace,tower,tyrant,overlord,victory,defeat}.ogg
textures/grass.png                ground texture (repeats ~10× across the map)
```

Hero ids: houyi luban sunshangxiang makeboluo daji anqila wangzhaojun zhugeliang diaochan sunwukong libai hanxin yase dianwei zhaoyun chengyaojin zhangfei caiwenji zhuangzhou niumo

After adding files: `bash scripts/deploy.sh --push` (the pack is copied to the site with the build).
