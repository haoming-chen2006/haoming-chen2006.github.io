local mouYingzi = fk.CreateSkill({
  name = "mou__yingzi",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__yingzi"] = "英姿",
  [":mou__yingzi"] = "锁定技，摸牌阶段开始时，你每满足以下一项条件此摸牌阶段摸牌基数和本回合手牌上限便+1，" ..
  "你的手牌数不少于2，你的装备区内牌数不少于1，你的体力值不少于2。",

  ["$mou__yingzi1"] = "交之总角，付之九州！",
  ["$mou__yingzi2"] = "定策分两治，纵马饮三江！",
}

mouYingzi:addEffect(fk.DrawNCards, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
     return
      target == player and
      player:hasSkill(mouYingzi.name) and
      (player:getHandcardNum() > 1 or #player:getCardIds("e") > 0 or player.hp > 1)
  end,
  on_use = function(self, event, target, player, data)
     if player.hp > 1 then
       player.room:addPlayerMark(player, "mou__yingzi-turn", 1)
     end
     if player:getHandcardNum() > 1 then
       player.room:addPlayerMark(player, "mou__yingzi-turn", 1)
     end
     if #player:getCardIds("e") > 0 then
       player.room:addPlayerMark(player, "mou__yingzi-turn", 1)
     end
     data.n = data.n + player:getMark("mou__yingzi-turn")
  end,
})

mouYingzi:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(mouYingzi.name) then
      return player:getMark("mou__yingzi-turn")
    else
      return 0
    end
  end,
})

return mouYingzi
