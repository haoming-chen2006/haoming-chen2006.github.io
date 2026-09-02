local liedu = fk.CreateSkill {
  name = "liedu",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["liedu"] = "烈妒",
  [":liedu"] = "锁定技，其他女性角色和手牌数大于你的角色不能响应你使用的牌。",

  ["$liedu1"] = "好个贱婢，看来留不得你。",
  ["$liedu2"] = "待本后开膛破肚，一验是子是女。",
}

liedu:addEffect(fk.CardUsing, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(liedu.name) and
      (data.card.trueName == "slash" or data.card:isCommonTrick()) and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p:isFemale() or p:getHandcardNum() > player:getHandcardNum()
      end)
  end,
  on_use = function(self, event, target, player, data)
    local targets = table.filter(player.room:getOtherPlayers(player, false), function(p)
      return p:isFemale() or p:getHandcardNum() > player:getHandcardNum()
    end)
    if #targets > 0 then
      data.disresponsiveList = data.disresponsiveList or {}
      for _, p in ipairs(targets) do
        table.insertIfNeed(data.disresponsiveList, p)
      end
    end
  end,
})

return liedu
