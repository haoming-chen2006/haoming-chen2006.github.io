local huzhu = fk.CreateSkill {
  name = "tw__huzhu",
}

Fk:loadTranslationTable{
  ["tw__huzhu"] = "护主",
  [":tw__huzhu"] = "出牌階段限一次，若你的裝備區有牌，你可以令一名其他角色交給你一張手牌，然後其獲得你裝備區的一張牌。若其體力值不大於你，"..
  "你可以令其回復1點體力。",

  ["#tw__huzhu"] = "护主：令一名角色交给你一张手牌，然后其获得你一张装备，若其体力值不大于你可以令其回复体力",
  ["#tw__huzhu-give"] = "护主：交给 %src 一张手牌，然后你获得其装备区的一张牌",
  ["#tw__huzhu-invoke"] = "护主：你可以令 %dest 回复1点体力",
}

huzhu:addEffect("active", {
  anim_type = "support",
  prompt = "#tw__huzhu",
  card_num = 0,
  target_num = 1,
  can_use = function(self, player)
    return #player:getCardIds("e") > 0 and player:usedSkillTimes(huzhu.name, Player.HistoryPhase) == 0
  end,
  card_filter = Util.FalseFunc,
  target_filter = function(self, player, to_select, selected)
    return #selected == 0 and to_select ~= player and not to_select:isKongcheng()
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local target = effect.tos[1]
    local card = room:askToCards(target, {
      skill_name = huzhu.name,
      include_equip = false,
      min_num = 1,
      max_num = 1,
      prompt = "#tw__huzhu-give:"..player.id,
      cancelable = false,
    })
    room:obtainCard(player, card, false, fk.ReasonGive, target, huzhu.name)
    if not player.dead and not target.dead and #player:getCardIds("e") > 0 then
      local id = room:askToChooseCard(target, {
        target = player,
        flag = "e",
        skill_name = huzhu.name,
      })
      room:obtainCard(target, id, true, fk.ReasonPrey, target, huzhu.name)
    end
    if not player.dead and not target.dead and target:isWounded() and player.hp >= target.hp and
      room:askToSkillInvoke(player, {
        skill_name = huzhu.name,
        prompt = "#tw__huzhu-invoke::"..target.id
      }) then
      room:recover{
        who = target,
        num = 1,
        recoverBy = player,
        skillName = huzhu.name,
      }
    end
  end,
})

return huzhu
