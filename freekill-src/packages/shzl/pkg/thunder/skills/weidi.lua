local weidi = fk.CreateSkill {
  name = "thunder__weidi",
  tags = {Skill.Lord},
}

Fk:loadTranslationTable{
  ["thunder__weidi"] = "伪帝",
  [":thunder__weidi"] = "主公技，弃牌阶段开始时，你可以将至多超出手牌上限张数的手牌交给等量的其他群雄角色。",

  ["#thunder__weidi-give"] = "伪帝：你可以将至多 %arg 张手牌分配给其他群雄角色各一张",

  ["$thunder__weidi1"] = "传国玉玺在手，朕语便是天言。",
  ["$thunder__weidi2"] = "传朕旨意，诸部遵旨即可。",
}

weidi:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(weidi.name) and
      player.phase == Player.Discard and player:getHandcardNum() > player:getMaxCards() and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p.kingdom == "qun"
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return p.kingdom == "qun"
    end)
    local n = player:getHandcardNum() - player:getMaxCards()
    room:askToYiji(player, {
      cards = player:getCardIds("h"),
      targets = targets,
      skill_name = weidi.name,
      min_num = 0,
      max_num = n,
      prompt = "#thunder__weidi-give:::"..n,
      single_max = 1,
    })
  end,
})

return weidi
