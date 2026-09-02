local wansha = fk.CreateSkill {
  name = "wansha",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["wansha"] = "完杀",
  [":wansha"] = "锁定技，除进行濒死流程的角色以外的其他角色于你的回合内不能使用【桃】。",

  ["$wansha1"] = "神仙难救，神仙难救啊。",
  ["$wansha2"] = "我要你三更死，谁敢留你到五更！",
}

wansha:addEffect(fk.EnterDying, {
  can_refresh = function(self, event, target, player, data)
    return player:hasSkill(wansha.name) and player.room.current == player
  end,
  on_refresh = function(self, event, target, player, data)
    player.room:notifySkillInvoked(player, wansha.name, "offensive")
    player:broadcastSkillInvoke(wansha.name)
  end,
})
wansha:addEffect("prohibit", {
  prohibit_use = function(self, player, card)
    if card.name == "peach" and not player.dying then
      return table.find(Fk:currentRoom().alive_players, function(p)
        return Fk:currentRoom().current == p and p:hasSkill(wansha.name) and p ~= player
      end)
    end
  end,
})

return wansha
