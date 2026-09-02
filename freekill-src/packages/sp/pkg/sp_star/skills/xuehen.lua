local xuehen = fk.CreateSkill {
  name = "xuehen",
}

Fk:loadTranslationTable{
  ["xuehen"] = "雪恨",
  [":xuehen"] = "每个角色的结束阶段开始时，若你的体力牌为竖置状态，你须横置之，然后选择一项：1.弃置当前回合角色X张牌（X为你已损失的体力值）；"..
  "2.视为对一名任意角色使用一张【杀】。",

  ["xuehen_discard"] = "弃置%dest%arg张牌",
  ["xuehen_slash"] = "视为使用一张无距离次数限制的【杀】",
  ["#xuehen-discard"] = "雪恨：弃置 %dest %arg张牌",
}

xuehen:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(xuehen.name) and target.phase == Player.Finish and player:getMark("@@fenyong") > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "@@fenyong", 0)
    local all_choices = {"xuehen_discard::"..room.current.id..":"..player:getLostHp(), "xuehen_slash"}
    local choices = table.simpleClone(all_choices)
    if room.current.dead or room.current:isNude() then
      table.remove(choices, 1)
    end
    if not table.find(room:getOtherPlayers(player, false), function (p)
      return player:canUseTo(Fk:cloneCard("slash"), p, {bypass_distances = true, bypass_times = true})
    end) then
      table.removeOne(choices, "xuehen_slash")
    end
    if #choices == 0 then return end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = xuehen.name,
      all_choices = all_choices,
    })
    if choice ~= "xuehen_slash" then
      room:doIndicate(player, {room.current})
      local cards = room:askToChooseCards(player, {
        target = room.current,
        skill_name = xuehen.name,
        min = 1,
        max = player:getLostHp(),
        flag = "he",
        prompt = "#xuehen-discard::"..room.current.id..":"..player:getLostHp(),
      })
      room:throwCard(cards, xuehen.name, room.current, player)
    else
      room:askToUseVirtualCard(player, {
        name = "slash",
        skill_name = xuehen.name,
        cancelable = false,
        extra_data = {
          bypass_distances = true,
          bypass_times = true,
          extraUse = true,
        },
      })
    end
  end,
})

return xuehen
