Fk:loadTranslationTable{
  ["ex__tieji"] = "铁骑",
  [":ex__tieji"] = "当你使用【杀】指定目标后，你可以令其本回合内非锁定技失效，然后进行一次判定，其需弃置一张花色与判定结果花色相同的牌，"..
  "否则其无法响应此【杀】。",

  ["@@tieji-turn"] = "铁骑",
  ["#ex__tieji-invoke"] = "铁骑：是否对 %dest 发动“铁骑”，令其本回合非锁定技失效？",
  ["#ex__tieji-discard"] = "铁骑：弃置一张%arg牌，否则无法响应此【杀】",

  ["$ex__tieji1"] = "目标敌阵，全军突击！",
  ["$ex__tieji2"] = "敌人阵型已乱，随我杀！",
}

local tieji = fk.CreateSkill{
  name = "ex__tieji",
}

tieji:addEffect(fk.TargetSpecified, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(tieji.name) and
      data.card.trueName == "slash" and not data.to.dead
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = tieji.name,
      prompt = "#ex__tieji-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local to = data.to
    room:addPlayerMark(to, "@@tieji-turn")
    room:addPlayerMark(to, MarkEnum.UncompulsoryInvalidity .. "-turn")
    local judge = {
      who = player,
      reason = tieji.name,
      pattern = ".|.|^nosuit",
    }
    room:judge(judge)
    if not data.to.dead and judge.card and judge.card.suit ~= "nosuit" then
      if #room:askToDiscard(to, {
        max_num = 1,
        min_num = 1,
        include_equip = true,
        skill_name = self.name,
        cancelable = true,
        pattern = ".|.|"..judge.card:getSuitString(),
        prompt = "#ex__tieji-discard:::"..judge.card:getSuitString(true),
      }) == 0 then
        data.disresponsive = true
      end
    end
  end,
})

return tieji
