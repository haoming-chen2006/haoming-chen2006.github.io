local mouSongwei = fk.CreateSkill({
  name = "mou__songwei",
  tags = { Skill.Lord },
})

Fk:loadTranslationTable{
  ["mou__songwei"] = "颂威",
  [":mou__songwei"] = "主公技，出牌阶段开始时，若你有〖行殇〗，你获得X枚“颂”标记（X为存活的其他魏势力角色数的两倍）。",

  ["$mou__songwei1"] = "江山锦绣，尽在朕手。",
  ["$mou__songwei2"] = "成功建业，扬我魏威。",
}

mouSongwei:addEffect(fk.EventPhaseStart, {
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player.phase == Player.Play and
      player:hasSkill(mouSongwei.name) and
      player:hasSkill("mou__xingshang", true) and
      player:getMark("@mou__xingshang_song") < 9 and
      table.find(player.room.alive_players, function(p) return p.kingdom == "wei" and p ~= player end)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local weiNum = #table.filter(room.alive_players, function(p) return p.kingdom == "wei" and p ~= player end)
    room:addPlayerMark(player, "@mou__xingshang_song", math.min(weiNum * 2, 9 - player:getMark("@mou__xingshang_song")))
  end,
})

return mouSongwei
