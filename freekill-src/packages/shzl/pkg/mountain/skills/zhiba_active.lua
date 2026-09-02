local zhiba_active = fk.CreateSkill {
  name = "zhiba_active&",
}

Fk:loadTranslationTable{
  ["zhiba_active&"] = "制霸",
  [":zhiba_active&"] = "出牌阶段限一次，你可与孙策拼点（若其发动过〖魂姿〗，其可以拒绝此拼点），若你没赢，其可以获得拼点的两张牌。",

  ["#zhiba"] = "制霸：你可以与孙策拼点",
}

zhiba_active:addEffect("active", {
  mute = true,
  prompt = "#zhiba",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(zhiba_active.name, Player.HistoryPhase) == 0 and player.kingdom == "wu" and not player:isKongcheng() and
      table.find(Fk:currentRoom().alive_players, function(p)
        return p:hasSkill("zhiba") and p ~= player and player:canPindian(p)
      end)
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local targets = table.filter(room.alive_players, function(p)
      return p:hasSkill("zhiba") and p ~= player and player:canPindian(p)
    end)
    local target
    if #targets == 1 then
      target = targets[1]
    else
      target = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = "zhiba",
        prompt = "#zhiba",
        cancelable = false,
      })[1]
    end
    if not target then return end
    room:notifySkillInvoked(target, "zhiba")
    target:broadcastSkillInvoke("zhiba")
    room:doIndicate(player.id, { target.id })
    if target:usedSkillTimes("hunzi", Player.HistoryGame) + target:usedSkillTimes("m_ex__hunzi", Player.HistoryGame) > 0 and
      room:askToChoice(target, {
        choices = {"zhiba_yes", "zhiba_no"},
        skill_name = "zhiba",
        prompt = "#zhiba-ask:" .. player.id,
      }) == "zhiba_no" then
      return
    end
    local pindian = player:pindian({target}, "zhiba")
    if target.dead then return end
    if pindian.results[target].winner ~= player then
      local to_get = {}
      local cid = pindian.fromCard and pindian.fromCard:getEffectiveId()
      if room:getCardArea(cid) == Card.DiscardPile then
        table.insert(to_get, cid)
      end
      local toCard = pindian.results[target].toCard
      cid = toCard and toCard:getEffectiveId()
      if room:getCardArea(cid) == Card.DiscardPile then
        table.insertIfNeed(to_get, cid)
      end
      if #to_get > 0 then
        room:obtainCard(target, to_get, true, fk.ReasonJustMove, target, "zhiba")
      end
    end
  end,
})

return zhiba_active
